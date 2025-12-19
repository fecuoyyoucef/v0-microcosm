from PIL import Image
import os

# المسار الأصلي للأيقونة الكبيرة
OUTPUT_DIR = "public/icons"

# الأحجام المطلوبة
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def generate_icons():
    # تحميل الصورة الأصلية
    try:
        # جرب فتح الصورة من مصادر مختلفة
        source_paths = [
            "public/icons/icon-512x512.jpg",
            "public/icons/icon-512x512.png", 
            "public/icons/icon-192x192.jpg",
            "public/icons/icon-192x192.png",
            "public/icon-512x512.png",
            "public/icon.png"
        ]
        
        img = None
        used_path = None
        for path in source_paths:
            if os.path.exists(path):
                img = Image.open(path)
                used_path = path
                print(f"تم تحميل الصورة من: {path}")
                print(f"الحجم الأصلي: {img.size}")
                print(f"النوع: {img.format}")
                break
        
        if img is None:
            print("خطأ: لم يتم العثور على صورة أصلية")
            print("الملفات الموجودة في public/icons/:")
            if os.path.exists("public/icons"):
                for f in os.listdir("public/icons"):
                    print(f"  - {f}")
            return
        
        # تحويل إلى RGBA إذا لزم الأمر
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # إنشاء مجلد الأيقونات إذا لم يكن موجوداً
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # توليد الأيقونات بكل الأحجام
        for size in SIZES:
            # تغيير الحجم مع الحفاظ على الجودة
            resized = img.resize((size, size), Image.LANCZOS)
            
            # حفظ كـ PNG حقيقي
            output_path = f"{OUTPUT_DIR}/icon-{size}x{size}.png"
            resized.save(output_path, "PNG", optimize=True)
            print(f"تم إنشاء: {output_path} ({size}x{size})")
        
        print("\nتم إنشاء جميع الأيقونات بنجاح!")
        
    except Exception as e:
        print(f"خطأ: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generate_icons()
