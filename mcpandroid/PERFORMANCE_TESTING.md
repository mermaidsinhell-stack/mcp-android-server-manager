# Performance Testing Guide

## Overview
This guide helps you measure the impact of the performance optimizations implemented for the MCP Android Server Manager.

## Prerequisites

### 1. Enable Performance Monitor
```javascript
// Add to App.tsx or index.tsx (development only)
if (__DEV__) {
  const { LogBox } = require('react-native');
  LogBox.ignoreLogs(['Warning: ...']); // Ignore log notification by message

  // Show performance monitor
  // Shake device or Cmd+D (iOS) / Cmd+M (Android) -> Show Perf Monitor
}
```

### 2. Install React DevTools
```bash
npm install -g react-devtools
# or
yarn global add react-devtools

# Start DevTools
react-devtools
```

### 3. Enable Profiler in React DevTools
1. Open React DevTools
2. Click "Profiler" tab
3. Click the record button (circle icon)
4. Perform actions in app
5. Stop recording
6. Analyze flame graph and ranked chart

---

## Performance Tests

### Test 1: FlatList Virtualization
**Objective**: Verify only visible items are rendered

#### Setup
```javascript
// Add to index.tsx temporarily for testing
const renderServerItem: ListRenderItem<typeof servers[number]> = useCallback(({ item, index }) => {
  console.log(`Rendering server ${index}: ${item.name}`);
  return (
    <ServerCard
      server={item}
      onPress={() => handleServerPress(item.id)}
      onStart={() => handleStartServer(item.id)}
      onStop={() => handleStopServer(item.id)}
    />
  );
}, [handleServerPress, handleStartServer, handleStopServer]);
```

#### Test Steps
1. Add 100+ servers to the app
2. Open app and check console
3. Count render logs - should be ~10-15 (not 100)
4. Scroll to bottom
5. Count new render logs - should add ~10-15 more
6. Scroll back to top
7. Verify no re-renders (items should be cached)

#### Expected Results
- ✅ Initial render: 10-15 logs (not 100)
- ✅ Scroll: Only new visible items logged
- ✅ Memory: Stable, not growing
- ✅ FPS: 60 (check Perf Monitor)

#### Actual Results
```
Initial renders: _____
Renders after scroll: _____
FPS during scroll: _____
Memory usage: _____
```

---

### Test 2: React.memo Effectiveness
**Objective**: Verify ServerCard only re-renders when its data changes

#### Setup
```javascript
// Add to ServerCard.tsx temporarily
const ServerCardComponent: React.FC<ServerCardProps> = ({
  server,
  onPress,
  onStart,
  onStop,
}) => {
  console.log(`ServerCard render: ${server.name} (${server.status})`);

  // ... rest of component
};
```

#### Test Steps
1. Add 20 servers
2. Open app - check console for 10-15 renders
3. Start ONE server
4. Count console logs - should be 1 (just that server)
5. Stop that server
6. Count console logs - should be 1 again
7. Navigate to detail screen and back
8. Verify appropriate re-renders

#### Expected Results
- ✅ Status change: 1 re-render (not 20)
- ✅ Navigation: Only visible cards re-render
- ✅ Unchanged cards: 0 re-renders

#### Actual Results
```
Re-renders on single status change: _____
Re-renders on navigation: _____
Total unnecessary re-renders: _____
```

---

### Test 3: useCallback Stability
**Objective**: Verify handlers don't break memoization

#### Setup
```javascript
// Add to ServerCard.tsx
const ServerCardComponent: React.FC<ServerCardProps> = ({
  server,
  onPress,
  onStart,
  onStop,
}) => {
  // Track prop changes
  const onPressRef = React.useRef(onPress);
  const onStartRef = React.useRef(onStart);
  const onStopRef = React.useRef(onStop);

  React.useEffect(() => {
    if (onPressRef.current !== onPress) {
      console.warn(`onPress changed for ${server.name}`);
      onPressRef.current = onPress;
    }
    if (onStartRef.current !== onStart) {
      console.warn(`onStart changed for ${server.name}`);
      onStartRef.current = onStart;
    }
    if (onStopRef.current !== onStop) {
      console.warn(`onStop changed for ${server.name}`);
      onStopRef.current = onStop;
    }
  });

  // ... rest of component
};
```

#### Test Steps
1. Add 10 servers
2. Open app
3. Wait 5 seconds
4. Check console - should be NO warnings about handler changes
5. Navigate to another screen and back
6. Check console - warnings OK on mount, but not during updates

#### Expected Results
- ✅ No handler reference changes during normal updates
- ✅ React.memo equality checks pass
- ✅ No unnecessary re-renders triggered by new function refs

#### Actual Results
```
Handler changes detected: _____
Unexpected re-renders: _____
```

---

### Test 4: Memory Leak Detection
**Objective**: Verify no memory leaks on unmount

#### Setup
1. Enable JavaScript memory profiling
2. Use React DevTools Memory Profiler
3. Or use Chrome DevTools with Remote JS Debugging

#### Test Steps
1. Take heap snapshot (Baseline)
2. Navigate to home screen
3. Navigate to server detail screen
4. Navigate back
5. Repeat steps 2-4 fifty times
6. Take another heap snapshot
7. Compare snapshots - look for growing retained size

#### Expected Results
- ✅ No growing component tree
- ✅ No retained closures from unmounted components
- ✅ No "Warning: Can't perform a React state update on an unmounted component"
- ✅ Heap size stable or only slightly growing

#### Actual Results
```
Initial heap size: _____ MB
Final heap size: _____ MB
Retained components: _____
Console warnings: _____
```

---

### Test 5: Scroll Performance Benchmark
**Objective**: Measure FPS during aggressive scrolling

#### Setup
1. Enable Perf Monitor (Cmd+D/M -> Show Perf Monitor)
2. Add 200 servers
3. Use `react-native-performance` for detailed metrics (optional)

#### Test Steps
1. Open app with 200 servers
2. Note JS FPS and UI FPS
3. Scroll from top to bottom rapidly
4. Note lowest FPS during scroll
5. Repeat 5 times
6. Calculate average

#### Expected Results
- ✅ JS FPS: 55-60
- ✅ UI FPS: 55-60
- ✅ No dropped frames
- ✅ Smooth visual scrolling

#### Actual Results
```
Test 1 - Min FPS: _____ JS / _____ UI
Test 2 - Min FPS: _____ JS / _____ UI
Test 3 - Min FPS: _____ JS / _____ UI
Test 4 - Min FPS: _____ JS / _____ UI
Test 5 - Min FPS: _____ JS / _____ UI
Average: _____ JS / _____ UI
```

---

### Test 6: Pull-to-Refresh Performance
**Objective**: Verify refresh doesn't cause performance issues

#### Test Steps
1. Add 100 servers
2. Start Profiler recording
3. Pull to refresh
4. Stop recording
5. Analyze flame graph

#### Expected Results
- ✅ Refresh completes in <500ms
- ✅ Only new/changed items re-render
- ✅ No unnecessary full list re-render
- ✅ FPS stays at 60

#### Actual Results
```
Refresh duration: _____ ms
Components re-rendered: _____
FPS during refresh: _____
```

---

## Performance Metrics Checklist

### Before Optimization (Baseline)
- [ ] Record components rendered (100 servers)
- [ ] Record re-renders on single update
- [ ] Record scroll FPS (200 servers)
- [ ] Record memory usage
- [ ] Record memory leak warnings
- [ ] Document navigation performance

### After Optimization
- [ ] Record components rendered (100 servers)
- [ ] Record re-renders on single update
- [ ] Record scroll FPS (200 servers)
- [ ] Record memory usage
- [ ] Record memory leak warnings
- [ ] Document navigation performance

### Expected Improvements
| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Components rendered (100 servers) | 100 | 10-15 | >80% reduction |
| Re-renders on update | 20 | 1 | >90% reduction |
| Scroll FPS (200 servers) | 15-30 | 60 | 2-4x improvement |
| Memory usage | High | Low | >50% reduction |
| Memory leaks | Yes | No | 0 warnings |

---

## React DevTools Profiler Analysis

### Flame Graph Analysis
1. **Look for wide bars**: Indicate expensive renders
2. **Look for repeated patterns**: Indicate unnecessary re-renders
3. **Look for yellow/red**: Indicate slow components
4. **Compare before/after**: Verify optimizations worked

### Ranked Chart Analysis
1. **Sort by render duration**: Find slowest components
2. **Check render count**: Find components rendering too often
3. **Verify memo components**: Should show "Did not render" when props unchanged

### Common Issues to Look For
- ❌ ServerCard rendering when props unchanged
- ❌ FlatList rendering all items at once
- ❌ Handlers creating new references on every render
- ❌ Components rendering during navigation (memory leaks)
- ✅ Only changed components rendering
- ✅ Virtualization working (only visible items rendered)
- ✅ Memo working (unchanged items skipped)

---

## Production Performance Monitoring

### Enable in Production (Optional)
```javascript
// src/utils/performance.ts
import { InteractionManager } from 'react-native';

export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();

  if (end - start > 16) { // More than one frame (60 FPS)
    console.warn(`[PERF] ${name} took ${end - start}ms`);
  }
};

export const runAfterInteractions = (fn: () => void) => {
  InteractionManager.runAfterInteractions(fn);
};
```

### Usage
```javascript
measurePerformance('loadServers', () => {
  loadServers();
});
```

---

## Troubleshooting

### Issue: FlatList not virtualizing
**Symptoms**: All items rendered at once
**Solutions**:
- Verify `getItemLayout` not set (breaks virtualization)
- Check `windowSize` prop set correctly
- Ensure items have consistent height

### Issue: React.memo not working
**Symptoms**: All cards re-render on every update
**Solutions**:
- Verify handlers wrapped with useCallback
- Check memo equality function logic
- Ensure props are primitive or stable references

### Issue: Memory leaks persist
**Symptoms**: "Can't perform React state update" warnings
**Solutions**:
- Verify all useEffect hooks have cleanup
- Check async operations check `isMounted` flag
- Ensure event listeners removed in cleanup

### Issue: Scroll performance still poor
**Symptoms**: FPS drops below 30 during scroll
**Solutions**:
- Reduce `windowSize` (try 5-11)
- Increase `maxToRenderPerBatch` (try 15-20)
- Enable `removeClippedSubviews`
- Simplify ServerCard render (remove complex calculations)

---

## Success Criteria

### Must Pass
- ✅ All 6 performance tests above pass
- ✅ No memory leak warnings
- ✅ Scroll FPS > 50 with 200 servers
- ✅ Single server update causes only 1 re-render
- ✅ All functionality preserved
- ✅ All styling preserved

### Nice to Have
- ✅ Scroll FPS = 60 with 500 servers
- ✅ Zero unnecessary re-renders in Profiler
- ✅ Memory usage <50MB with 100 servers
- ✅ Refresh completes in <300ms

---

## Reporting Template

```markdown
# Performance Test Results

**Date**: ___________
**Platform**: iOS / Android
**Device**: ___________
**React Native Version**: ___________
**Number of Servers**: ___________

## Test Results

### Test 1: FlatList Virtualization
- Initial renders: _____
- Expected: 10-15
- Status: PASS / FAIL

### Test 2: React.memo Effectiveness
- Re-renders on single update: _____
- Expected: 1
- Status: PASS / FAIL

### Test 3: useCallback Stability
- Handler changes: _____
- Expected: 0
- Status: PASS / FAIL

### Test 4: Memory Leak Detection
- Console warnings: _____
- Expected: 0
- Status: PASS / FAIL

### Test 5: Scroll Performance
- Average FPS: _____
- Expected: 55-60
- Status: PASS / FAIL

### Test 6: Pull-to-Refresh
- Duration: _____ ms
- Expected: <500ms
- Status: PASS / FAIL

## Overall Assessment
- [ ] All tests passed
- [ ] Performance targets met
- [ ] No regressions found
- [ ] Ready for production

## Notes
_____________________________
```

---

## Automated Performance Testing (Future)

### Detox + Perf Metrics
```javascript
// e2e/performance.test.js
describe('Performance Tests', () => {
  it('should scroll 200 servers smoothly', async () => {
    await device.launchApp({ newInstance: true });
    // Add 200 test servers
    await element(by.id('server-list')).scroll(2000, 'down', NaN, 0.85);
    // Assert FPS > 50 (requires custom metrics)
  });
});
```

This is a future enhancement - manual testing sufficient for now.
