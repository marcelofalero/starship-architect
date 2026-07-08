#!/bin/bash

# Load environment variables
if [ -f "../../.env" ]; then
    source ../../.env
elif [ -f ".env" ]; then
    source .env
fi

PROJECT_ID=1798624
USER_ID=948038
DONE_STATUS_ID=10913090

TICKET_REF="$1"
ACTION="$2"

if [ -z "$TICKET_REF" ] || [ -z "$ACTION" ]; then
    echo "Usage: ./manage_ticket.sh <ticket_ref_number> <close|assign|both>"
    echo "Example: ./manage_ticket.sh 17 both"
    exit 1
fi

AUTH_TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"type\": \"normal\", \"username\": \"$TAIGA_USERNAME\", \"password\": \"$TAIGA_PASSWORD\"}" https://api.taiga.io/api/v1/auth | jq -r '.auth_token')

# Fetch the exact user story using ref
US_DATA=$(curl -s -X GET -H "Authorization: Bearer $AUTH_TOKEN" "https://api.taiga.io/api/v1/userstories/by_ref?ref=$TICKET_REF&project=$PROJECT_ID")
US_ID=$(echo "$US_DATA" | jq -r '.id')
VERSION=$(echo "$US_DATA" | jq -r '.version')
CURRENT_ASSIGNED=$(echo "$US_DATA" | jq -r '.assigned_to')
CURRENT_STATUS=$(echo "$US_DATA" | jq -r '.status')

if [ "$US_ID" == "null" ]; then
    echo "Ticket Ref #$TICKET_REF not found in project $PROJECT_ID."
    exit 1
fi

ASSIGN_TO=$CURRENT_ASSIGNED
STATUS=$CURRENT_STATUS

if [ "$ACTION" == "assign" ] || [ "$ACTION" == "both" ]; then
    ASSIGN_TO=$USER_ID
fi

if [ "$ACTION" == "close" ] || [ "$ACTION" == "both" ]; then
    STATUS=$DONE_STATUS_ID
fi

echo "Updating Ticket Ref #$TICKET_REF (Internal ID: $US_ID)..."
RESPONSE=$(curl -s -X PATCH -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" -d "{
  \"assigned_to\": $ASSIGN_TO,
  \"status\": $STATUS,
  \"version\": $VERSION
}" "https://api.taiga.io/api/v1/userstories/$US_ID")

NEW_VERSION=$(echo "$RESPONSE" | jq -r '.version')

if [ "$NEW_VERSION" != "null" ]; then
    echo "Successfully updated Ticket #$TICKET_REF to Version $NEW_VERSION!"
else
    echo "Failed to update ticket:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi
