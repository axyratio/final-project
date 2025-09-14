import requests

BASE_URL = "http://localhost:3001/citizen/validate"

# test cases
test_cases = [
    {
        "title": "เลขบัตรไม่ครบ 13 หลัก",
        "payload": {"citizen_id": "12345", "first_name": "John", "last_name": "Doe"},
    },
    {
        "title": "ชื่อเป็นตัวใหญ่ (ควรผ่าน เพราะ clean เป็น lowercase)",
        "payload": {"citizen_id": "1348600019172", "first_name": "KITTIPHONG", "last_name": "U-SA"},
    },
    {
        "title": "ชื่อมีสัญลักษณ์ - (ควรผ่าน เพราะ clean ตัดออก)",
        "payload": {"citizen_id": "1348600019172", "first_name": "Kittiphong", "last_name": "U-sa"},
    },
    {
        "title": "เลขบัตรตรง แต่ชื่อไม่ตรง",
        "payload": {"citizen_id": "1348600019172", "first_name": "Kitti", "last_name": "Wrong"},
    },
    {
        "title": "บัตรหมดอายุ",
        "payload": {"citizen_id": "1234567890123", "first_name": "John", "last_name": "Doe"},
    },
]

def run_tests():
    for tc in test_cases:
        print(f"\n🧪 กำลังทดสอบ: {tc['title']}")
        try:
            res = requests.post(BASE_URL, json=tc["payload"])
            if res.status_code == 200:
                print(res.json())
            else: print(res.json())

        except Exception as e:
            print("❌ ERROR ไม่สามารถเชื่อมต่อ API:", e)

if __name__ == "__main__":
    run_tests()
