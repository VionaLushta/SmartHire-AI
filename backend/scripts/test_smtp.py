"""Send the fixed SmartHire AI SMTP configuration test email."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.email_service import (
    EmailConfigurationError,
    EmailDeliveryError,
    EmailService,
    EmailServiceError,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a SmartHire AI SMTP test email.")
    parser.add_argument("recipient", help="Email address that should receive the test message")
    args = parser.parse_args()

    try:
        result = EmailService().send_configuration_test_email(args.recipient)
    except EmailConfigurationError:
        print("SMTP test failed: configuration is incomplete or invalid.")
        return 1
    except EmailDeliveryError as exc:
        print(f"SMTP test failed: {exc}")
        return 1
    except OSError:
        print("SMTP test failed: network or operating system error.")
        return 1
    except EmailServiceError as exc:
        print(f"SMTP test failed: {exc}")
        return 1

    if result.get("status") == "sent":
        print("SMTP test email accepted for delivery.")
        return 0

    print("SMTP test failed: delivery was not accepted.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
