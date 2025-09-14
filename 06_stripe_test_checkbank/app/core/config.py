import os
from dotenv import load_dotenv

load_dotenv()

STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", "sk_test_51RjNbVP2m5opTW0wraKjYAcJxZU5vv0YImHQg5N8VNCYcFV52a4UMhVP4nCBCYW4WAVMXVey1kvu8bGgQVdqv2Zl00AEatqLAO")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
