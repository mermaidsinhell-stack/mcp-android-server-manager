#!/bin/bash

echo "=== State Reconciliation Implementation Verification ==="
echo ""

# Check files exist
echo "Checking files..."
files=(
    "mcpandroid/src/services/metrics.ts"
    "mcpandroid/src/services/stateReconciliation.ts"
    "STATE_RECONCILIATION.md"
    "RECONCILIATION_QUICK_REFERENCE.md"
    "IMPLEMENTATION_SUMMARY_RECONCILIATION.md"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "  ✓ $file ($size)"
    else
        echo "  ✗ $file (MISSING)"
        all_exist=false
    fi
done

echo ""

# Check modified files
echo "Checking modified files..."
modified_files=(
    "mcpandroid/src/types/index.ts"
    "mcpandroid/src/stores/serverStore.ts"
    "mcpandroid/src/app/_layout.tsx"
)

for file in "${modified_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (MISSING)"
        all_exist=false
    fi
done

echo ""

# Check key imports
echo "Checking key exports..."

if grep -q "export const metricsService" mcpandroid/src/services/metrics.ts; then
    echo "  ✓ metricsService exported"
else
    echo "  ✗ metricsService export missing"
fi

if grep -q "export const stateReconciliationService" mcpandroid/src/services/stateReconciliation.ts; then
    echo "  ✓ stateReconciliationService exported"
else
    echo "  ✗ stateReconciliationService export missing"
fi

if grep -q "ReconciliationMetrics" mcpandroid/src/types/index.ts; then
    echo "  ✓ ReconciliationMetrics type defined"
else
    echo "  ✗ ReconciliationMetrics type missing"
fi

if grep -q "initializeReconciliation" mcpandroid/src/stores/serverStore.ts; then
    echo "  ✓ initializeReconciliation exported"
else
    echo "  ✗ initializeReconciliation export missing"
fi

if grep -q "AppState" mcpandroid/src/app/_layout.tsx; then
    echo "  ✓ AppState lifecycle management added"
else
    echo "  ✗ AppState lifecycle management missing"
fi

echo ""

if [ "$all_exist" = true ]; then
    echo "✓ All files created successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run typecheck"
    echo "2. Test app startup"
    echo "3. Test lifecycle (background/foreground)"
    echo "4. Verify notifications work"
else
    echo "✗ Some files are missing. Please review the implementation."
fi
