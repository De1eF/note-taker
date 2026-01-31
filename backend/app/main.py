from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import List
import re
from .models import SheetModel, UpdateSheetModel

app = FastAPI()

# --- CORS Config ---
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database ---
client = AsyncIOMotorClient("mongodb://mongo:27017")
db = client.note_taker
sheet_collection = db.sheets

# --- Helpers ---
async def parse_and_update_connections(sheet_id: str, content: str):
    """
    Parses tags ~tagname, finds matching sheets, and syncs connections bi-directionally.
    Crucially, it removes stale connections from sheets that no longer match.
    """
    # 1. Parse tags from content
    tags = set(re.findall(r"~(\w[\w-]*)", content))
    
    related_ids = []
    
    # 2. Find sheets containing those tags (if any tags exist)
    if tags:
        regex_queries = [{"content": {"$regex": f"~{tag}\\b"}} for tag in tags]
        
        related_cursor = sheet_collection.find({
            "$or": regex_queries,
            "_id": {"$ne": ObjectId(sheet_id)},
            "is_deleted": False
        })
        
        async for doc in related_cursor:
            related_ids.append(str(doc["_id"]))
    
    # 3. Update THIS sheet's connections
    await sheet_collection.update_one(
        {"_id": ObjectId(sheet_id)},
        {"$set": {"connections": related_ids}}
    )
    
    # 4. Bi-directional Sync Logic
    
    # A. ADD connections: Ensure the found sheets point back to this one
    if related_ids:
        await sheet_collection.update_many(
            {"_id": {"$in": [ObjectId(rid) for rid in related_ids]}},
            {"$addToSet": {"connections": sheet_id}}
        )

    # B. REMOVE connections (Cleanup): 
    # Find any sheet that currently connects to THIS sheet...
    # ...but is NOT in our new list of matches.
    # Remove THIS sheet_id from their connections list.
    cleanup_filter = {
        "connections": sheet_id,
        "_id": {"$nin": [ObjectId(rid) for rid in related_ids]}
    }
    
    await sheet_collection.update_many(
        cleanup_filter,
        {"$pull": {"connections": sheet_id}}
    )

    return related_ids

# --- Routes ---

@app.get("/sheets/", response_model=List[SheetModel])
async def get_sheets():
    sheets = []
    cursor = sheet_collection.find({"is_deleted": False})
    async for document in cursor:
        sheets.append(document)
    return sheets

@app.post("/sheets/", response_model=SheetModel)
async def create_sheet(sheet: SheetModel):
    new_sheet = sheet.dict(by_alias=True)
    if "_id" in new_sheet:
        del new_sheet["_id"]
    
    result = await sheet_collection.insert_one(new_sheet)
    created_sheet = await sheet_collection.find_one({"_id": result.inserted_id})
    
    # Run connection logic for the new sheet
    if "content" in new_sheet:
        await parse_and_update_connections(str(result.inserted_id), new_sheet["content"])
        # Fetch again to get updated connections
        created_sheet = await sheet_collection.find_one({"_id": result.inserted_id})
        
    return created_sheet

@app.patch("/sheets/{sheet_id}", response_model=SheetModel)
async def update_sheet(sheet_id: str, update_data: UpdateSheetModel):
    # Filter out None values
    data = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")

    # Perform the update
    result = await sheet_collection.update_one(
        {"_id": ObjectId(sheet_id)},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sheet not found")
    
    # If content changed, re-evaluate connections
    if "content" in data:
        await parse_and_update_connections(sheet_id, data["content"])

    updated_sheet = await sheet_collection.find_one({"_id": ObjectId(sheet_id)})
    return updated_sheet

@app.post("/sheets/{sheet_id}/duplicate", response_model=SheetModel)
async def duplicate_sheet(sheet_id: str):
    original = await sheet_collection.find_one({"_id": ObjectId(sheet_id)})
    if not original:
        raise HTTPException(status_code=404, detail="Sheet not found")
        
    new_sheet = original.copy()
    del new_sheet["_id"]
    new_sheet["title"] = f"{original['title']} (Copy)"
    # Offset position slightly
    new_sheet["positionInSpace"]["x"] += 20
    new_sheet["positionInSpace"]["y"] += 20
    
    result = await sheet_collection.insert_one(new_sheet)
    
    # Recalculate connections for the clone
    await parse_and_update_connections(str(result.inserted_id), new_sheet["content"])
    
    created = await sheet_collection.find_one({"_id": result.inserted_id})
    return created

@app.delete("/sheets/{sheet_id}")
async def delete_sheet(sheet_id: str):
    # Soft delete
    result = await sheet_collection.update_one(
        {"_id": ObjectId(sheet_id)},
        {"$set": {"is_deleted": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sheet not found")
    
    # Remove this ID from everyone else's connections
    await sheet_collection.update_many(
        {"connections": sheet_id},
        {"$pull": {"connections": sheet_id}}
    )
        
    return {"success": True}