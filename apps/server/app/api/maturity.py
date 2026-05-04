from fastapi import APIRouter, UploadFile, File, Form
from PIL import Image, ExifTags
import io

from app.maturity_schemas import PredictResponse, ROI
from app.services.maturity_geo import geo_area_px2, geo_class_from_area, geo_confidence
from app.ml_models.maturity_cnn.model import predict_cnn

router = APIRouter(prefix="/maturity", tags=["Maturity"])

def get_exif_aware_dims(pil_image: Image.Image) -> tuple[int, int]:
    raw_w, raw_h = pil_image.size
    try:
        exif = pil_image._getexif()
        if exif is None: return raw_w, raw_h
        orientation_tag = next((tag for tag, name in ExifTags.TAGS.items() if name == "Orientation"), None)
        if orientation_tag is None: return raw_w, raw_h
        orientation = exif.get(orientation_tag)
        if orientation in (5, 6, 7, 8): return raw_h, raw_w
        return raw_w, raw_h
    except Exception:
        return raw_w, raw_h

@router.post("/predict", response_model=PredictResponse)
async def predict(
    cnn_image: UploadFile = File(...),
    geo_image: UploadFile = File(...),
    roi_x:     float      = Form(...),
    roi_y:     float      = Form(...),
    roi_r:     float      = Form(...),
):
    roi_obj = ROI(x=roi_x, y=roi_y, r=roi_r)

    cnn_bytes = await cnn_image.read()
    cnn_cls, cnn_conf = predict_cnn(cnn_bytes)

    if cnn_cls == "NON_ALOE":
        return {
            "is_aloe_vera": False,
            "cnn_model": {"predicted_class": cnn_cls, "confidence": float(cnn_conf)},
            "geo_algorithm": None,
            "classes_match": False,
            "harvest_required": False,
            "harvest_message": None,
        }

    geo_bytes = await geo_image.read()
    geo_pil_raw = Image.open(io.BytesIO(geo_bytes))
    w, h = get_exif_aware_dims(geo_pil_raw)

    area = geo_area_px2(roi_obj.r, w, h)
    geo_cls = geo_class_from_area(area)
    geo_conf = geo_confidence(area)

    classes_match = (cnn_cls == geo_cls)
    harvest_required = classes_match and cnn_cls == "MATURE"
    harvest_message = "Ready to harvest! Best time: Morning or Evening" if harvest_required else None

    return {
        "is_aloe_vera": True,
        "cnn_model": {"predicted_class": cnn_cls, "confidence": float(cnn_conf)},
        "geo_algorithm": {"detected_area": float(area), "predicted_class": geo_cls, "confidence": float(geo_conf)},
        "classes_match": classes_match,
        "harvest_required": harvest_required,
        "harvest_message": harvest_message,
    }
