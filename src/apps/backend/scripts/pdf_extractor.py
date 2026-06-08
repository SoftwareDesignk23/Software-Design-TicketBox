import sys
import os
import json
import uuid
import fitz  # PyMuPDF
import cv2
import numpy as np
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
PROTOTXT_PATH = os.path.join(MODELS_DIR, 'deploy.prototxt')
MODEL_PATH = os.path.join(MODELS_DIR, 'res10_300x300_ssd_iter_140000.caffemodel')

def download_file(url, dest):
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        try:
            urllib.request.urlretrieve(url, dest)
        except Exception as e:
            print(f"Error downloading {url}: {e}", file=sys.stderr)

def ensure_models():
    prototxt_url = "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"
    caffemodel_url = "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"
    download_file(prototxt_url, PROTOTXT_PATH)
    download_file(caffemodel_url, MODEL_PATH)

def detect_faces_dnn(image_bytes):
    try:
        ensure_models()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return 0, None, 0.0
            
        (h, w) = img.shape[:2]
        # Ignore very small images
        if h < 100 or w < 100:
            return 0, None, 0.0

        net = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, MODEL_PATH)
        blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
        net.setInput(blob)
        detections = net.forward()
        
        face_count = 0
        best_confidence = 0.0
        
        for i in range(0, detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            # DNN detects faces (including profiles if clear enough, but trained mainly on front/semi-front)
            if confidence > 0.5:
                face_count += 1
                if confidence > best_confidence:
                    best_confidence = confidence
                    
        return face_count, img, float(best_confidence)
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        return 0, None, 0.0

def process_pdf(pdf_path, output_dir):
    try:
        doc = fitz.open(pdf_path)
        extracted_text = ""
        
        best_avatar_bytes = None
        best_ext = "png"
        best_confidence = 0.0
        found_single_face = False
        
        # Extract text
        for page in doc:
            extracted_text += page.get_text() + "\n"
            
        # Extract images
        for i in range(len(doc)):
            page = doc[i]
            image_list = page.get_images(full=True)
            
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                face_count, cv_img, conf = detect_faces_dnn(image_bytes)
                
                if face_count == 1:
                    # Ideal case: exactly one person
                    if not found_single_face or conf > best_confidence:
                        best_avatar_bytes = image_bytes
                        best_ext = base_image["ext"]
                        best_confidence = conf
                        found_single_face = True
                elif face_count > 1 and not found_single_face:
                    # Fallback: if we haven't found a single face yet, keep the one with best confidence
                    # (Maybe a group photo, better than nothing if no portrait exists)
                    if conf > best_confidence:
                        best_avatar_bytes = image_bytes
                        best_ext = base_image["ext"]
                        best_confidence = conf
                        
        doc.close()
        
        avatar_path = None
        if best_avatar_bytes:
            filename = f"avatar_{uuid.uuid4().hex}.{best_ext}"
            avatar_path = os.path.join(output_dir, filename)
            with open(avatar_path, "wb") as f:
                f.write(best_avatar_bytes)
        
        result = {
            "text": extracted_text.strip(),
            "avatar_path": avatar_path
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python pdf_extractor.py <pdf_path> <avatar_output_dir>"}))
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        
    process_pdf(pdf_path, output_dir)
