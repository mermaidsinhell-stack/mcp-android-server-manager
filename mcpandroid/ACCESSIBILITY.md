# Accessibility Guide

## Overview

The MCP Android Server Manager is designed to be fully accessible to all users, including those who rely on screen readers like TalkBack (Android) and VoiceOver (iOS). This document outlines the accessibility features implemented, testing procedures, and known issues.

## Implemented Accessibility Features

### 1. Screen Reader Support

All interactive elements throughout the app include comprehensive accessibility labels:

#### Home Screen (`src/app/index.tsx`)
- **FAB (Floating Action Button)**: "Add new MCP server" with hint about opening add server screen
- **Empty State Button**: "Add your first server" for initial setup
- **Refresh Control**: "Refresh server list" for pull-to-refresh
- **Header**: Properly marked with `accessibilityRole="header"`

#### Server Cards (`src/components/ServerCard.tsx`)
- **Card Touchable**: Announces server name and current status
- **Status Badges**: Includes `accessibilityValue` with current status (RUNNING, STOPPED, STARTING, ERROR)
- **Start/Stop Buttons**: Clear labels like "Start [server name]" with hints about what the action does
- **Info Display**: Port and branch information grouped with combined label
- **Remote URL**: Announces full Tailscale URL when server is running
- **Error Messages**: Marked as `accessibilityRole="alert"` with `accessibilityLiveRegion="assertive"`

#### Tailscale Card (`src/components/TailscaleCard.tsx`)
- **Status Badges**: "Status: Tailscale installed" or "Status: Connected to Tailscale"
- **Action Buttons**: "Install Tailscale", "Open Tailscale app" with contextual hints
- **Copy Button**: "Copy IP address [IP]" with expanded touch targets
- **Connection Status**: Live regions announce status changes
- **Error Messages**: Alert role for immediate attention

#### Server Detail Screen (`src/app/server-detail.tsx`)
- **Server Info**: Status changes announced via live regions
- **Action Buttons**: "Start/Stop [server name] server" with detailed hints
- **Delete Button**: Clear warning "Permanently removes this server. This action cannot be undone."
- **Copy URL Button**: "Copy URL [URL]" with expanded touch target
- **Logs Section**: Announces log count or "No logs available"
- **Refresh Logs**: "Refresh server logs" with loading state

#### Add Server Screen (`src/app/add-server.tsx`)
- **Input Field**: "GitHub repository URL" with hint about format
- **Validate Button**: "Check repository" with validation status
- **Repository Info**: Summary announces all repo details (name, stars, language, description)
- **Popular Servers**: Each announces name and description
- **Add Button**: "Add [repo name] server" with hint about cloning

### 2. Touch Target Sizes

All interactive elements meet or exceed platform accessibility guidelines:

- **iOS HIG Requirement**: 44x44 points minimum ✓
- **Android Material**: 48x48dp minimum ✓

#### Specific Improvements:
- **Copy Buttons**: Added `hitSlop` with 12pt padding in all directions to expand touch area without changing visual size
  - Visual size maintained at design system specs
  - Touch area expanded to 44x44pt+ for accessibility
- **Refresh Buttons**: Added `hitSlop` with 10pt padding
- **Small Action Buttons**: Proper `minWidth` and `minHeight` in button styles

### 3. Dynamic Content Announcements

Live regions ensure screen readers announce important state changes:

- **Server Status Changes**: `accessibilityLiveRegion="polite"` for status transitions (stopped → starting → running)
- **Error Messages**: `accessibilityLiveRegion="assertive"` for immediate alerts
- **Loading States**: `accessibilityState={{ busy: true }}` during async operations
- **Log Updates**: Polite announcements when log content changes

### 4. Proper Element Roles

All UI elements use appropriate accessibility roles:

- **Buttons**: `accessibilityRole="button"` on all touchable actions
- **Headers**: `accessibilityRole="header"` on section titles
- **Alerts**: `accessibilityRole="alert"` on error messages
- **Text**: `accessibilityRole="text"` on readonly content
- **Progress**: `accessibilityRole="progressbar"` on loading states

### 5. State Management

Interactive elements properly communicate their state:

- **Disabled States**: `accessibilityState={{ disabled: true }}`
- **Loading States**: `accessibilityState={{ busy: true }}`
- **Selected States**: Status badges include value announcements

### 6. Content Grouping

Related information is grouped to reduce verbosity:

- **Server Details**: Port, branch, creation date grouped as single announcement
- **Repository Info**: Name, stars, language, description combined
- **IP Display**: Label and value announced together

### 7. Decorative Elements Hidden

Visual-only elements excluded from accessibility tree:

- **Dividers**: `accessibilityElementsHidden={true}` on visual separators
- **Icon Text**: Hidden when parent has descriptive label
- **Loading Spinners**: Hidden when status text provides context

## Testing Guide

### TalkBack (Android)

#### Enable TalkBack:
1. Go to **Settings > Accessibility > TalkBack**
2. Toggle **Use TalkBack** on
3. Confirm the dialog

#### Testing Procedure:

1. **Navigation Test**:
   - Swipe right/left to navigate between elements
   - Verify all interactive elements are announced
   - Check that announcements are clear and descriptive

2. **Interaction Test**:
   - Double-tap to activate buttons
   - Verify actions execute correctly
   - Listen for confirmation announcements

3. **Status Changes**:
   - Start a server and listen for status announcements
   - Stop a server and verify announcement
   - Check error messages are announced immediately

4. **Form Input**:
   - Navigate to Add Server screen
   - Enter text in repository field
   - Verify field label and hint are announced

5. **Touch Exploration**:
   - Enable "Explore by touch"
   - Touch small elements (copy buttons) and verify they respond
   - Check all buttons are reachable

#### Expected Behaviors:

- All buttons announce their label, role, and hint
- Status changes are announced without user action
- Error messages interrupt other announcements
- Input fields announce label, value, and hint
- Loading states announce "busy" status

### VoiceOver (iOS)

#### Enable VoiceOver:
1. Go to **Settings > Accessibility > VoiceOver**
2. Toggle **VoiceOver** on
3. Practice basic gestures in tutorial

#### Testing Procedure:

1. **Rotor Navigation**:
   - Use 2-finger rotation to access rotor
   - Navigate by headings to jump between sections
   - Verify all headers are properly marked

2. **Element Interaction**:
   - Single-tap to focus elements
   - Double-tap to activate
   - Listen for role announcements ("button", "header", etc.)

3. **Live Regions**:
   - Monitor automatic announcements during status changes
   - Verify errors interrupt current reading

4. **Touch Targets**:
   - Navigate to copy buttons and verify they're easy to tap
   - Check no elements are too small to activate

5. **Custom Actions**:
   - Check server cards for available actions
   - Verify swipe gestures work as expected

#### Expected Behaviors:

- VoiceOver announces: "[Label], [Role], [Hint]"
- Status badges announce current value
- Buttons respond to double-tap
- All headings navigable via rotor
- Touch targets meet 44x44pt minimum

### Manual Accessibility Checks

#### Visual Inspection:
```bash
# Check for missing labels (search for TouchableOpacity/Pressable without accessibility props)
grep -r "TouchableOpacity" --include="*.tsx" | grep -v "accessibilityLabel"
```

#### Common Issues to Check:
- [ ] Buttons without `accessibilityLabel`
- [ ] Status changes without `accessibilityLiveRegion`
- [ ] Small touch targets (< 44pt)
- [ ] Decorative elements not hidden
- [ ] Missing `accessibilityHint` on complex actions
- [ ] Forms without field labels

## Known Accessibility Issues

### Color Contrast

The app uses a Soft-Editorial Brutalism design system with specific color choices. Some color combinations may not meet WCAG AA standards:

#### Identified Issues:

1. **Gray Text on Peach Background**
   - Location: Descriptions throughout app
   - Colors: `#6b7280` (gray) on `#edd6d1` (peach)
   - Contrast Ratio: ~3.2:1
   - WCAG AA Requirement: 4.5:1
   - Impact: May be difficult to read for users with low vision
   - Status: Design system constraint - not modified

2. **Status Badge Contrast**
   - Location: Warning status badges
   - Colors: White text on `#f59e0b` (warning orange)
   - Contrast Ratio: ~3.0:1 (estimated)
   - Impact: Moderate visibility issues
   - Status: Design system constraint

3. **Secondary Action Buttons**
   - Location: Copy buttons, refresh links
   - Colors: May vary based on context
   - Impact: Some users may struggle to identify clickable elements
   - Mitigation: Screen reader labels provide full context

#### Recommendations:

If color contrast becomes a critical issue for users:

1. **System-Level Adjustments**:
   - Users can enable system-wide "Increase Contrast" modes
   - TalkBack/VoiceOver don't rely on visual contrast

2. **Future Improvements**:
   - Consider high-contrast theme toggle
   - Respect system "Increase Contrast" setting
   - Add user preference for alternative colors

3. **Current Workarounds**:
   - All information conveyed by color is also available via screen reader
   - Status indicators include text labels, not just colors
   - Critical actions use sufficient contrast (primary buttons)

### Design System Preservation

The following visual elements are intentionally preserved despite potential accessibility impacts:

- **No Border Radius**: Hard corners maintained (no usability impact)
- **2px Black Borders**: Design signature (actually aids visibility)
- **Hard Shadows**: 4px offset, no blur (helps define boundaries)
- **Specific Color Palette**: Peach, Pink, Blue, Gray (contrast issues noted above)

These are **not modified** as they define the app's visual identity, and all accessibility needs are met through:
- Comprehensive screen reader support
- Proper touch target sizing
- Clear labeling and state management
- Live region announcements

## Testing Checklist

Use this checklist when adding new features:

### For Every Interactive Element:
- [ ] `accessibilityRole` is set appropriately
- [ ] `accessibilityLabel` clearly describes the element
- [ ] `accessibilityHint` explains what happens when activated (for non-obvious actions)
- [ ] Touch target is at least 44x44pt (use `hitSlop` if visual size is smaller)
- [ ] Disabled state is communicated via `accessibilityState`

### For Dynamic Content:
- [ ] Status changes use `accessibilityLiveRegion="polite"`
- [ ] Errors use `accessibilityLiveRegion="assertive"`
- [ ] Loading states include `accessibilityState={{ busy: true }}`
- [ ] Success/failure feedback is announced

### For Forms:
- [ ] Input fields have `accessibilityLabel` for the field name
- [ ] Hints provide format guidance
- [ ] Validation errors are announced
- [ ] Submit buttons indicate loading state

### For Lists/Cards:
- [ ] Each item is focusable
- [ ] Labels include relevant context (name + status)
- [ ] Actions on items are clearly labeled
- [ ] Empty states are announced

### For Visual-Only Elements:
- [ ] Decorative icons have `accessibilityElementsHidden={true}`
- [ ] Dividers are hidden from accessibility tree
- [ ] Redundant text in buttons is hidden (when label covers it)

## Compliance Standards

This app aims to meet:

- **WCAG 2.1 Level A**: Minimum accessibility (✓ Met via screen reader support)
- **WCAG 2.1 Level AA**: Enhanced accessibility (⚠ Partial - color contrast issues)
- **iOS Human Interface Guidelines**: Accessibility chapter (✓ Met)
- **Android Material Design**: Accessibility guidelines (✓ Met)

## Future Enhancements

Potential accessibility improvements for future releases:

1. **High Contrast Mode**:
   - User-toggleable high-contrast theme
   - Override design colors for WCAG AA compliance
   - Persist preference across sessions

2. **Font Scaling**:
   - Test with Dynamic Type (iOS) and Font Size (Android)
   - Ensure layouts adapt to larger text sizes
   - Verify no text truncation at 200% scale

3. **Reduced Motion**:
   - Respect system "Reduce Motion" preference
   - Disable or simplify animations
   - Maintain functionality without motion

4. **Voice Control**:
   - Test with Voice Control (iOS) and Voice Access (Android)
   - Ensure all actions voice-controllable
   - Add voice hints where helpful

5. **Screen Reader Shortcuts**:
   - Custom actions for common operations
   - Jump-to-server shortcuts
   - Quick start/stop commands

6. **Haptic Feedback**:
   - Subtle haptics for status changes
   - Error vibration patterns
   - Success confirmations

## Resources

### Documentation:
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [iOS Accessibility](https://developer.apple.com/accessibility/)
- [Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Testing Tools:
- [Accessibility Scanner (Android)](https://play.google.com/store/apps/details?id=com.google.android.apps.accessibility.auditor)
- [Xcode Accessibility Inspector (iOS)](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/OSXAXTestingApps.html)

### Color Contrast Checkers:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)

## Support

If you encounter accessibility issues or have suggestions for improvements:

1. Check this document for known issues
2. Test with screen reader enabled
3. Report issues with:
   - Device and OS version
   - Screen reader used (TalkBack/VoiceOver)
   - Specific element or screen
   - Expected vs. actual behavior

## Changelog

### v1.0.0 - Initial Accessibility Implementation
- Added comprehensive `accessibilityLabel` to all interactive elements
- Implemented proper `accessibilityRole` assignments
- Added `accessibilityHint` for complex actions
- Fixed touch target sizes (minimum 44x44pt)
- Implemented `accessibilityLiveRegion` for dynamic content
- Added `accessibilityValue` for status indicators
- Grouped related content to reduce verbosity
- Hidden decorative elements from accessibility tree
- Documented known color contrast issues
