import base64
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import backend as lab

app = FastAPI()

# CORS relaxat pt Electron (local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def to_base64_png(img_u8: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img_u8)
    if not ok:
        raise ValueError("Nu pot encoda PNG")
    return base64.b64encode(buf.tobytes()).decode("utf-8")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/process")
async def process_image(
    file: UploadFile = File(...),
    filter_name: str = Form(...),
    d0: float = Form(40.0),
):
    try:
        image_bytes = await file.read()
        img_gray = lab.decode_to_gray(image_bytes)

        spatial = lab.spatial_filters(img_gray)
        freq = lab.frequency_filters(img_gray, float(d0))

        results = {"Original": img_gray}

        if filter_name in spatial:
            results[filter_name] = spatial[filter_name]
        elif filter_name in freq:
            results[filter_name] = freq[filter_name]
        else:
            raise HTTPException(status_code=400, detail=f"Filtru invalid: {filter_name}")

        payload = {name: to_base64_png(img) for name, img in results.items()}
        return {"images": payload}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
