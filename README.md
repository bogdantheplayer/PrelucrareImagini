# Project Filters – Image Processing Desktop Application

Project Filters is a desktop application for applying spatial-domain and frequency-domain filters to grayscale images.

The project combines an Electron frontend with a Python FastAPI backend and uses OpenCV and NumPy for image decoding, convolution, Fourier transforms, and result generation.

---

## Application Interface

The application provides a modern, responsive interface where users can:

- Upload an image in JPG, PNG, BMP, or another browser-supported image format
- Choose one of eight image filters
- Adjust the cutoff frequency (`D0`) for frequency-domain filters
- Compare the original image with the processed result
- Keep several filtered results visible at the same time
- Save individual results as PNG files
- Remove individual result cards or clear the entire workspace
- View processing status and error notifications

<img width="1919" alt="ui" src="https://github.com/user-attachments/assets/b6c9c93e-8a28-4558-b8e3-f1b0c9b4ef1a" />

---

## Features

### Image Input

- Local image upload
- Automatic conversion to grayscale
- Invalid image detection
- Original image preview

### Spatial-Domain Filters

- Mean filter (`3x3`)
- Gaussian filter (`3x3`)
- Laplace edge detection
- High-pass sharpening
- Custom convolution implementation
- Reflective border padding

### Frequency-Domain Filters

- Ideal Low-Pass Filter (`ILPF`)
- Gaussian Low-Pass Filter (`GLPF`)
- Ideal High-Pass Filter (`IHPF`)
- Gaussian High-Pass Filter (`GHPF`)
- Adjustable cutoff frequency (`D0`)
- Fourier transform and inverse transform using NumPy

### Result Management

- Side-by-side display of the original and processed images
- Multiple result cards
- Duplicate-result detection
- Separate results for different `D0` values
- PNG download for every generated image
- Individual removal and complete reset
- Loading, success, and error feedback

---

## Image Processing System

The Python backend is responsible for decoding the uploaded image, applying the selected filter, and returning the generated images to the Electron frontend.

### Spatial Filtering

Spatial filters operate directly on image pixels using convolution.

The application uses a custom convolution function with `BORDER_REFLECT_101` padding:

```python
def convolutie(img: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    H, W = img.shape
    kh, kw = kernel.shape
    pad_h, pad_w = kh // 2, kw // 2

    padded = cv2.copyMakeBorder(
        img,
        pad_h,
        pad_h,
        pad_w,
        pad_w,
        borderType=cv2.BORDER_REFLECT_101,
    )

    out = np.zeros((H, W), dtype=np.float32)
    for i in range(H):
        for j in range(W):
            zone = padded[i:i + kh, j:j + kw]
            out[i, j] = float(np.sum(zone * kernel))

    return out
```

### Frequency Filtering

Frequency filters transform the image using the two-dimensional Fast Fourier Transform (`FFT`), apply a frequency mask, and reconstruct the result using the inverse transform.

### How the Processing Flow Works

1. The user selects an image.
2. The user chooses a spatial or frequency filter.
3. For a frequency filter, the user sets the `D0` cutoff value.
4. The frontend sends the image and filter parameters to the FastAPI backend.
5. The backend:
   - decodes the image as grayscale;
   - computes the available spatial and frequency results;
   - selects the requested result;
   - encodes the original and processed images as PNG;
   - returns both images as Base64 strings.
6. The frontend displays the results in separate cards.
7. The user can save or remove each result.

### Advantages

- Runs locally
- Does not require cloud services or external APIs
- Provides direct comparison between original and filtered images
- Demonstrates both spatial and frequency image processing
- Keeps the Python processing layer separate from the desktop interface
- Supports easy extension with additional filters

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Checks whether the backend is available |
| `POST` | `/process` | Uploads and processes an image |

The `/process` endpoint expects `multipart/form-data`:

| Field | Type | Description |
|---|---|---|
| `file` | File | Image to process |
| `filter_name` | String | Name of the selected filter |
| `d0` | Float | Cutoff value for frequency filters; default is `40.0` |

Example response:

```json
{
  "images": {
    "Original": "BASE64_ENCODED_PNG",
    "Gaussian 3x3": "BASE64_ENCODED_PNG"
  }
}
```

---

## Tech Stack

| Component | Technology |
|---|---|
| Desktop Application | Electron |
| Frontend | HTML, CSS, JavaScript |
| Backend API | Python, FastAPI |
| ASGI Server | Uvicorn |
| Image Processing | OpenCV |
| Numerical Processing | NumPy |
| Frequency Analysis | NumPy FFT |
| Communication | REST HTTP, multipart form data, Base64 PNG |
| Package Managers | NPM, pip |

---

## Project Structure

```text
project/
│
├── backend/
│   ├── backend.py          # Convolution and image filters
│   ├── server.py           # FastAPI application and endpoints
│   ├── requirements.txt    # Python dependencies
│   └── .venv/              # Local Python environment (not committed)
│
├── frontend/
│   ├── index.html          # Application interface
│   ├── renderer.js         # API calls and interface logic
│   └── styles.css          # Application styling
│
├── main.js                 # Electron process and backend launcher
├── package.json            # Node.js project configuration
├── package-lock.json       # Locked Node.js dependencies
└── README.md
```

> Adjust the filenames above if the source files use different names in your local project.

---

## System Architecture

```text
Electron Desktop Application
          │
          ▼
HTML / CSS / JavaScript Frontend
          │
          │ REST HTTP
          ▼
Python FastAPI Backend
          │
          ▼
OpenCV + NumPy + FFT
```

---

## Requirements

Before running the project, install:

- Python 3.10 or newer
- Node.js and NPM
- A supported desktop operating system

The provided backend activation command is written for Windows.

---

## Installation

### 1. Clone the Repository

```bash
git clone <REPOSITORY_URL>
cd project
```

### 2. Configure the Python Backend

On Windows:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

If PowerShell blocks environment activation, use Command Prompt:

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

The backend dependencies are:

```text
fastapi
uvicorn[standard]
opencv-python
numpy
python-multipart
```

### 3. Install Electron Dependencies

```bash
npm install
```

Ensure `package.json` contains an Electron start script:

```json
{
  "scripts": {
    "start": "electron ."
  }
}
```

---

## Running the Application

### Option 1: Start the Backend and Frontend Separately

Open the first terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

Open a second terminal in the project root:

```bash
npm start
```

### Option 2: Let Electron Start the Backend

The Electron main process can start Uvicorn automatically:

```bash
npm start
```

For this option, the backend port in `main.js` must match the API address in `frontend/renderer.js`.

Recommended local configuration:

```javascript
// main.js
["-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000"]
```

```javascript
// frontend/renderer.js
const API_BASE = "http://127.0.0.1:8000";
```

---

## Important Notes

- The source configuration currently shows a port mismatch: the frontend requests port `8000`, while the Electron launcher starts Uvicorn on port `8001`. Use the same port in both files.
- The Python executable path in `main.js` is Windows-specific.
- The backend enables unrestricted CORS for local Electron development.
- Uploaded images are processed locally and are not stored by the backend.
- Processing time depends on image dimensions and the computer's hardware.
- The convolution and mask generation functions use explicit loops, making the implementation easy to study but slower for large images.
- The backend currently calculates all spatial and frequency results for every request before returning the selected filter.

---

## Academic Use

This project demonstrates:

- Digital image processing
- Spatial-domain convolution
- Smoothing, sharpening, and edge detection
- Two-dimensional Fourier transforms
- Low-pass and high-pass filtering
- Ideal and Gaussian frequency masks
- Desktop application development with Electron
- Python backend integration
- REST communication between JavaScript and FastAPI
- Image serialization using PNG and Base64

---

## Possible Extensions

- Add median, Sobel, Prewitt, and Canny filters
- Process color images using separate RGB channels
- Display the frequency spectrum and filter masks
- Add before-and-after comparison sliders
- Optimize convolution using vectorized operations or OpenCV functions
- Generate all selected filters in a single request
- Add drag-and-drop image upload
- Add batch image processing
- Add configurable kernel sizes
- Export processing parameters together with each result
- Package the application as a Windows installer
- Add automated backend and frontend tests
- Replace unrestricted CORS with a narrower local configuration


