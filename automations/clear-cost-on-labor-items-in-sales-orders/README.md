## Purpose
This PowerShell automation processes ConnectWise Manage sales orders that are awaiting agreement project completion. It prepares orders for conversion by cleaning product descriptions, setting recurring costs, and calculating appropriate end dates for recurring products.

## What It Does

### High-Level Process

1. **Identifies Target Orders**: Retrieves sales orders with status "Waiting.Agreement - Project Completion" that have an Agreement Start Date within the next 30 days
2. **Processes Each Order**:
    - Temporarily sets the opportunity to "Open" status to enable editing
    - Iterates through all products in the order
    - Cleans up product descriptions and pricing
    - Sets recurring end dates based on agreement start dates
    - Restores the opportunity to its original status
3. **Monitoring**: Logs all actions to Sentry for tracking and debugging

### Specific Actions Per Product

#### Description Cleanup

Removes problematic characters from customer descriptions:
- Question marks (`?`)
- Unwanted quotes
- `\no` strings
- HTML entities (`&nbsp`)

#### Service Products
For products with the "Service" catalog type:
- Sets recurring cost to $0.00

#### Recurring Products
For all products with recurring information:
- Calculates the recurring end date as the last day of the month following the Agreement Start Date
- Updates the product's recurring end date accordingly

## Schedule
Runs automatically via Azure Automation (schedule not specified in code)

## Error Handling
- Uses Sentry monitoring to capture and log errors
- Continues processing remaining orders if individual operations fail
- Includes verbose logging for troubleshooting

## Testing Mode
Supports a testing mode (`$Testing = $true`) that:

- Prompts for confirmation before processing each order
- Uses 1Password CLI to retrieve credentials locally
- Allows step-by-step validation

