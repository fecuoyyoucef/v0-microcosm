from PIL import Image, ImageDraw
import os

OUTPUT_DIR = "public/screenshots"

# لقطات الشاشة المطلوبة
SCREENSHOTS = [
    {
        "name": "mobile-home.png",
        "width": 1080,
        "height": 1920,
        "label": "Synaptic Space",
        "form_factor": "narrow"
    },
    {
        "name": "mobile-chat.png",
        "width": 1080,
        "height": 1920,
        "label": "Chat",
        "form_factor": "narrow"
    },
    {
        "name": "desktop-home.png",
        "width": 1920,
        "height": 1080,
        "label": "Synaptic Space Desktop",
        "form_factor": "wide"
    },
    {
        "name": "desktop-chat.png",
        "width": 1920,
        "height": 1080,
        "label": "Chat Desktop",
        "form_factor": "wide"
    }
]

def generate_screenshots():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    for screenshot in SCREENSHOTS:
        width = screenshot["width"]
        height = screenshot["height"]
        
        # إنشاء صورة بخلفية متدرجة
        img = Image.new('RGB', (width, height), '#0a0a0a')
        draw = ImageDraw.Draw(img)
        
        # رسم تدرج من الأزرق الداكن إلى الأسود
        for y in range(height):
            ratio = y / height
            r = int(10 * (1 - ratio))
            g = int(30 * (1 - ratio))
            b = int(60 * (1 - ratio))
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        
        # رسم دوائر زخرفية
        circle_color = (0, 180, 255, 50)
        for i in range(5):
            x = width // 4 + (i * width // 5) % width
            y = height // 3 + (i * height // 4) % height
            radius = 50 + i * 30
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], 
                        outline=(0, 180, 255), width=2)
        
        # رسم إطار
        border_color = (0, 212, 255)
        margin = 40
        draw.rectangle(
            [margin, margin, width - margin, height - margin],
            outline=border_color,
            width=3
        )
        
        # رسم عنوان التطبيق
        title = "Synaptic Space"
        # رسم مستطيل للعنوان
        title_box_height = 80
        draw.rectangle(
            [margin, margin, width - margin, margin + title_box_height],
            fill=(0, 30, 60)
        )
        
        # رسم خط تحت العنوان
        draw.line(
            [(margin, margin + title_box_height), (width - margin, margin + title_box_height)],
            fill=border_color,
            width=2
        )
        
        # حفظ الصورة
        output_path = f"{OUTPUT_DIR}/{screenshot['name']}"
        img.save(output_path, "PNG", optimize=True)
        print(f"تم إنشاء: {output_path} ({width}x{height})")
    
    print("\nتم إنشاء جميع لقطات الشاشة بنجاح!")

if __name__ == "__main__":
    generate_screenshots()
