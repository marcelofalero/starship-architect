#!/bin/bash

# Load environment variables
if [ -f "../../.env" ]; then
    source ../../.env
elif [ -f ".env" ]; then
    source .env
fi

PROJECT_ID=1798624
SUBJECT="$1"
DESCRIPTION="$2"

if [ -z "$SUBJECT" ]; then
    echo "Usage: ./create_ticket.sh \"Subject\" [\"Description\"]"
    exit 1
fi

AUTH_TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"type\": \"normal\", \"username\": \"$TAIGA_USERNAME\", \"password\": \"$TAIGA_PASSWORD\"}" https://api.taiga.io/api/v1/auth | jq -r '.auth_token')

echo "Creating ticket: $SUBJECT"
RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "{
  \"project\": $PROJECT_ID,
  \"subject\": \"$SUBJECT\",
  \"description\": \"$DESCRIPTION\"
}" https://api.taiga.io/api/v1/userstories)

TICKET_ID=$(echo "$RESPONSE" | jq -r '.id')
TICKET_REF=$(echo "$RESPONSE" | jq -r '.ref')

if [ "$TICKET_ID" != "null" ] && [ -n "$TICKET_ID" ]; then
    echo "Success! Ticket created with ID: $TICKET_ID (Ref #$TICKET_REF)"
else
    echo "Failed to create ticket:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi
