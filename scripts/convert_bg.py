"""Konversi gambar pantai upload menjadi latar belakang web Bluetech.

Output: /home/z/my-project/public/images/bg/beach-hero.jpg
- Palet asli dipertahankan, saturasi dinaikkan tipis agar selaras tema laut.
- JPG progresif quality 87 agar ringan dimuat.
"""
from PIL import Image, ImageEnhance

SRC = "/home/z/my-project/upload/pasted_image_1795189878867.png"
DST = "/home/z/my-project/public/images/bg/beach-hero.jpg"

im = Image.open(SRC).convert("RGB")
im = ImageEnhance.Color(im).enhance(1.08)
im = ImageEnhance.Contrast(im).enhance(1.02)
im.save(DST, quality=87, optimize=True, progressive=True)
print("saved:", im.size)

import os
print("bytes:", os.path.getsize(DST))
