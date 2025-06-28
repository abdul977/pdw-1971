#!/usr/bin/env python3
"""
Simple icon generator for PWA
Creates basic colored squares with PWA text as placeholder icons
Generates all required icon sizes for PWA compliance across different devices and platforms
"""

import os                                    # Operating system interface for directory operations
from PIL import Image, ImageDraw, ImageFont  # Python Imaging Library for image creation and manipulation

def create_icon(size, filename):
    """
    Create a simple PWA icon with gradient background and text
    Args:
        size (int): Square dimensions for the icon (width and height)
        filename (str): Output filename for the generated icon
    """
    # Create square RGB image with Material Design blue background (#2196F3)
    img = Image.new('RGB', (size, size), color='#2196F3')
    # Create drawing context for adding shapes and text
    draw = ImageDraw.Draw(img)

    # Add a simple gradient effect from top to bottom
    # Creates visual depth by gradually darkening the blue color
    for y in range(size):
        # Calculate alpha value for gradient effect (30% fade from top to bottom)
        alpha = int(255 * (1 - y / size * 0.3))
        # Generate hex color with slight variations in RGB values for gradient
        # Maintains blue hue while creating subtle depth effect
        color = f'#{hex(33 + int(alpha * 0.1))[2:].zfill(2)}{hex(150 + int(alpha * 0.1))[2:].zfill(2)}{hex(243)[2:].zfill(2)}'
        # Draw horizontal line across the width for each y position
        draw.line([(0, y), (size, y)], fill=color)

    # Font loading with fallback strategy for cross-platform compatibility
    try:
        # Calculate font size proportional to icon size (minimum 12px for readability)
        font_size = max(size // 8, 12)
        # Try to load Arial font (common on Windows/Mac)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            # Fallback to default system font if Arial not available
            font_size = max(size // 8, 12)
            font = ImageFont.load_default()
        except:
            # Final fallback if no fonts available (text will be skipped)
            font = None

    # Add main PWA text if font is available
    if font:
        text = "PWA"  # Main identifier text
        # Get text bounding box for precise positioning
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]   # Calculate text width
        text_height = bbox[3] - bbox[1]  # Calculate text height

        # Center text horizontally and position slightly above center vertically
        x = (size - text_width) // 2           # Horizontal center
        y = (size - text_height) // 2 - size // 8  # Slightly above center

        # Draw white text for contrast against blue background
        draw.text((x, y), text, fill='white', font=font)

        # Add smaller descriptive text for larger icons (96px and above)
        if size >= 96:
            try:
                # Use smaller font size for secondary text
                small_font = ImageFont.truetype("arial.ttf", max(size // 16, 8))
            except:
                # Fallback to main font if Arial not available
                small_font = font

            small_text = "OFFLINE"  # Indicates PWA offline capability
            # Get bounding box for smaller text positioning
            bbox = draw.textbbox((0, 0), small_text, font=small_font)
            text_width = bbox[2] - bbox[0]

            # Center horizontally, position in lower quarter of icon
            x = (size - text_width) // 2
            y = size * 3 // 4  # 75% down from top

            # Draw secondary text in white
            draw.text((x, y), small_text, fill='white', font=small_font)

    # Save the generated icon as PNG file with optimization
    img.save(filename, 'PNG')
    print(f"Created {filename}")  # Confirm successful creation

def main():
    """
    Main function to generate all required PWA icon sizes
    Creates icons directory and generates icons for all standard PWA sizes
    """
    # Create icons directory if it doesn't exist (exist_ok prevents errors if already exists)
    os.makedirs('icons', exist_ok=True)

    # Icon sizes needed for PWA compliance across different platforms:
    # 32px  - Favicon and browser tab
    # 72px  - iOS home screen (iPad)
    # 96px  - Android home screen (mdpi)
    # 128px - Chrome Web Store
    # 144px - Windows tile (small)
    # 152px - iOS home screen (iPad retina)
    # 192px - Android home screen (xxhdpi), Chrome splash screen
    # 384px - Android splash screen
    # 512px - PWA splash screen, app store listings
    sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512]

    # Generate icon for each required size
    for size in sizes:
        # Create standardized filename format
        filename = f'icons/icon-{size}x{size}.png'
        create_icon(size, filename)

    # Display completion summary
    print(f"\nGenerated {len(sizes)} icons in the 'icons' directory!")
    print("Icons are ready for your PWA!")

# Main execution block - only runs when script is executed directly
if __name__ == "__main__":
    main()
