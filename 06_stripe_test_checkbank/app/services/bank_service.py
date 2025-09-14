
import stripe


def check_bank_connected_account(bank: dict):
    bank = stripe.Token.create(
        bank_account={
            "country": bank.country,
            "currency": bank.currency,
            "account_holder_name": bank.account_holder_name,
            "account_holder_type": bank.account_holder_type,
            "routing_number": bank.routing_number,
            "account_number": bank.account_number,
        }
    )
    
   
    return bank
