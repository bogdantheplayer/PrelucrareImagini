import cv2
import numpy as np


def convolutie(img: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    H, W = img.shape
    kh, kw = kernel.shape
    pad_h, pad_w = kh // 2, kw // 2

    padded = cv2.copyMakeBorder(
        img, pad_h, pad_h, pad_w, pad_w, borderType=cv2.BORDER_REFLECT_101
    )

    out = np.zeros((H, W), dtype=np.float32)
    for i in range(H):
        for j in range(W):
            zona = padded[i : i + kh, j : j + kw]
            out[i, j] = float(np.sum(zona * kernel))
    return out


def clip_u8(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0, 255).astype(np.uint8)


def decode_to_gray(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Nu pot decoda imaginea (format invalid?)")
    return img


def spatial_filters(img_gray: np.ndarray) -> dict[str, np.ndarray]:
    kernel_mean = np.ones((3, 3), dtype=np.float32) / 9.0
    mean_filtered = clip_u8(convolutie(img_gray, kernel_mean))

    kernel_gauss = np.array([[1, 2, 1],
                             [2, 4, 2],
                             [1, 2, 1]], dtype=np.float32)
    kernel_gauss /= kernel_gauss.sum()
    gauss_filtered = clip_u8(convolutie(img_gray, kernel_gauss))

    kernel_laplace = np.array([[-1, -1, -1],
                               [-1,  8, -1],
                               [-1, -1, -1]], dtype=np.float32)
    laplace = clip_u8(convolutie(img_gray, kernel_laplace))

    kernel_highpass = np.array([[-1, -1, -1],
                                [-1,  9, -1],
                                [-1, -1, -1]], dtype=np.float32)
    highpass = clip_u8(convolutie(img_gray, kernel_highpass))

    return {
        "Mean 3x3": mean_filtered,
        "Gaussian 3x3": gauss_filtered,
        "Laplace": laplace,
        "High-pass": highpass,
    }


def _freq_setup(img_gray: np.ndarray):
    dft = np.fft.fft2(img_gray)
    dft_shift = np.fft.fftshift(dft)
    rows, cols = img_gray.shape
    cx, cy = rows // 2, cols // 2
    return dft_shift, rows, cols, cx, cy


def ideal_low_pass(rows: int, cols: int, cx: int, cy: int, D0: float) -> np.ndarray:
    mask = np.zeros((rows, cols), np.float32)
    for u in range(rows):
        for v in range(cols):
            D = np.sqrt((u - cx) ** 2 + (v - cy) ** 2)
            if D <= D0:
                mask[u, v] = 1.0
    return mask


def gaussian_low_pass(rows: int, cols: int, cx: int, cy: int, D0: float) -> np.ndarray:
    mask = np.zeros((rows, cols), np.float32)
    for u in range(rows):
        for v in range(cols):
            D = np.sqrt((u - cx) ** 2 + (v - cy) ** 2)
            mask[u, v] = np.exp(-(D ** 2) / (2 * (D0 ** 2)))
    return mask


def frequency_filters(img_gray: np.ndarray, D0: float) -> dict[str, np.ndarray]:
    dft_shift, rows, cols, cx, cy = _freq_setup(img_gray)

    ILPF_mask = ideal_low_pass(rows, cols, cx, cy, D0)
    GLPF_mask = gaussian_low_pass(rows, cols, cx, cy, D0)
    IHPF_mask = 1.0 - ILPF_mask
    GHPF_mask = 1.0 - GLPF_mask

    def apply_mask(mask: np.ndarray) -> np.ndarray:
        inv = np.fft.ifft2(np.fft.ifftshift(dft_shift * mask))
        return np.abs(inv).astype(np.uint8)

    return {
        "Ideal Low-Pass (ILPF)": apply_mask(ILPF_mask),
        "Gaussian Low-Pass (GLPF)": apply_mask(GLPF_mask),
        "Ideal High-Pass (IHPF)": apply_mask(IHPF_mask),
        "Gaussian High-Pass (GHPF)": apply_mask(GHPF_mask),
    }
