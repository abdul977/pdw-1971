#!/usr/bin/env python3
"""
Simple icon generator for PWA
Creates basic colored squares with PWA text as placeholder icons
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    """Create a simple PWA icon"""
    # Create image with gradient-like background
    img = Image.new('RGB', (size, size), color='#2196F3')
    draw = ImageDraw.Draw(img)
    
    # Add a simple gradient effect
    for y in range(size):
        alpha = int(255 * (1 - y / size * 0.3))
        color = f'#{hex(33 + int(alpha * 0.1))[2:].zfill(2)}{hex(150 + int(alpha * 0.1))[2:].zfill(2)}{hex(243)[2:].zfill(2)}'
        draw.line([(0, y), (size, y)], fill=color)
    
    # Try to use a font, fall back to default if not available
    try:
        font_size = max(size // 8, 12)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font_size = max(size // 8, 12)
            font = ImageFont.load_default()
        except:
            font = None
    
    # Add PWA text
    if font:
        text = "PWA"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - size // 8
        
        draw.text((x, y), text, fill='white', font=font)
        
        # Add smaller text
        if size >= 96:
            try:
                small_font = ImageFont.truetype("arial.ttf", max(size // 16, 8))
            except:
                small_font = font
            
            small_text = "OFFLINE"
            bbox = draw.textbbox((0, 0), small_text, font=small_font)
            text_width = bbox[2] - bbox[0]
            
            x = (size - text_width) // 2
            y = size * 3 // 4
            
            draw.text((x, y), small_text, fill='white', font=small_font)
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename}")

def main():
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Icon sizes needed for PWA
    sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512]
    
    for size in sizes:
        filename = f'icons/icon-{size}x{size}.png'
        create_icon(size, filename)
    
    print(f"\nGenerated {len(sizes)} icons in the 'icons' directory!")
    print("Icons are ready for your PWA!")

if __name__ == "__main__":
    main()
