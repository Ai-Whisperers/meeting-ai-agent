# Mobile Mode - Operational Meeting Recorder

This document explains the automatic device detection and dual-mode operation of the Meetings Agent application.

## Overview

The application automatically detects the device type and switches between two distinct modes:

### **Desktop Mode** (Laptops, PCs)
Real-time **B2B Strategic Advisor** - provides live insights during business meetings

### **Mobile Mode** (Phones, Tablets)
**Operational Meeting Recorder** - focuses on accurate transcription and post-meeting operational analysis

## Why Two Modes?

### Desktop Mode Use Case
- **Screen sharing scenarios** (Zoom, Teams, Google Meet)
- Captures both system audio (other participants) and microphone (you)
- Real-time strategic insights act as a "teleprompter" for live meetings
- Best for: Sales calls, client meetings, negotiations

### Mobile Mode Use Case
- **Phone recording scenarios** (in-person meetings, conferences, workshops)
- Captures microphone audio only
- Prioritizes accurate transcription over real-time insights
- Generates operational summaries after meeting concludes
- Best for: Training sessions, workshops, internal meetings, knowledge capture

## Automatic Device Detection

The application uses sophisticated device detection based on:

1. **User Agent** - Detects mobile device indicators
2. **Platform** - Excludes desktop platforms (Windows, macOS, Linux)
3. **Screen Size** - Mobile devices typically ≤768px width
4. **Touch Support** - Presence of touch capabilities

### Detection Logic

```javascript
✅ Detected as Mobile:
- iPhone, iPad, Android phones/tablets
- Any device with mobile user agent
- Touch-enabled devices with small screens

✅ Detected as Desktop:
- Windows laptops/PCs
- MacBooks and iMacs
- Linux desktops/laptops
- Any device with desktop platform
```

**Important:** Laptops and notebooks are **always** detected as desktop, even if they have touch screens.

## Mode Differences

### Desktop Mode: B2B Strategic Insights

**AI Prompt Focus:**
- Real-time strategic advice during conversations
- B2B relationship building
- Sales and negotiation tactics

**Insight Categories:**
- 🟢 **OPPORTUNITIES** - When to emphasize value, pitch solutions
- 🟡 **CAUTIONS** - Client concerns that need addressing
- 🔴 **RISKS** - Red flags and potential deal-breakers
- 🔵 **NEXT STEPS** - Follow-up actions and proposals

**Timing:** Insights generated in **real-time** as conversation flows

**Best For:**
- Sales calls with prospects
- Client meetings and presentations
- Partnership negotiations
- Investor pitches

---

### Mobile Mode: Operational Insights

**AI Prompt Focus:**
- Accurate, real-time transcription
- Post-meeting operational analysis
- Knowledge capture and documentation

**Insight Categories:**
- 🔧 **TECHNIQUES MENTIONED** - Methodologies, frameworks, best practices
- 💡 **ADVICE GIVEN** - Recommendations, expert opinions, guidance
- ✅ **ACTION ITEMS** - Tasks, deadlines, assignments, follow-ups
- 🎯 **KEY INSIGHTS** - Main conclusions, decisions, lessons learned

**Timing:** Insights synthesized **after processing full conversation**

**Best For:**
- Training sessions and workshops
- Team meetings and standups
- Conference talks and presentations
- Expert interviews and consultations
- Knowledge capture sessions

## Mobile Mode Prompt

```
You are an expert meeting transcriber and operational analyst.

PRIMARY OBJECTIVE: Provide accurate, real-time transcription of all spoken content.

SECONDARY OBJECTIVE: After processing the full conversation, synthesize operational insights:

**TECHNIQUES MENTIONED**:
- Business methodologies (Agile, Lean, Six Sigma)
- Technical approaches and best practices
- Communication or negotiation techniques
- Problem-solving methods
- Tools or software mentioned

**ADVICE GIVEN**:
- Expert opinions offered
- Suggested solutions to problems
- Best practices recommended
- Warnings or cautionary advice
- Decision-making guidance

**ACTION ITEMS**:
- Tasks to be completed
- Follow-up actions required
- Deadlines mentioned
- Assignments or responsibilities
- Resources to gather or review

**KEY INSIGHTS**:
- Main conclusions reached
- Critical decisions made
- Important patterns or trends
- Lessons learned
- Knowledge gaps identified
```

## Using Mobile Mode

### Step 1: Access on Mobile Device

Open the application in your **phone's mobile browser**:

```
https://your-deployed-app.com
```

Or if testing locally (requires same network):

```
http://your-computer-ip:5174
```

### Step 2: Grant Permissions

The app will request:
- ✅ **Microphone access** - To capture audio from your phone
- ❌ **Screen sharing** - Not needed/available on mobile

### Step 3: Start Recording

1. Click "Start Meeting"
2. Grant microphone permission when prompted
3. The device detection will automatically activate **Mobile Mode**
4. You'll see console logs confirming: `📱 Mode: MOBILE (Operational Recorder)`

### Step 4: Record Your Meeting

- Place phone on table or hold it
- Ensure microphone captures all speakers
- The app will transcribe in real-time
- Operational insights will be generated as patterns emerge

### Step 5: Review Results

After the meeting:
- Review full transcript
- Check operational insights by category
- Export as Markdown or JSON
- Data syncs automatically to SQLite database

## Technical Implementation

### Device Detection (frontend/src/utils/device-detection.ts)

```typescript
export function detectDevice(): DeviceInfo {
  // Checks user agent, platform, screen size, touch support
  // Returns: { type: 'mobile' | 'desktop', ... }
}

export function isMobileDevice(): boolean {
  return detectDevice().isMobile;
}
```

### Dynamic Prompt Selection (frontend/src/services/realtime-client.ts)

```typescript
constructor(config: RealtimeConfig, handlers: RealtimeEventHandlers) {
  // Detect device type
  this.isMobile = isMobileDevice();

  // Log mode for debugging
  console.log(`📱 Mode: ${this.isMobile ? 'MOBILE' : 'DESKTOP'}`);
}

async connect(audioStream: MediaStream): Promise<void> {
  // Select prompt based on device
  const instructions = this.isMobile
    ? OPERATIONAL_RECORDER_PROMPT
    : B2B_STRATEGIST_PROMPT;

  await this.client.updateSession({ instructions, ... });
}
```

### Insight Parsing (frontend/src/services/realtime-client.ts)

```typescript
private parseAndEmitInsights(text: string): void {
  if (this.isMobile) {
    // Parse: TECHNIQUES MENTIONED, ADVICE GIVEN, ACTION ITEMS, KEY INSIGHTS
  } else {
    // Parse: OPPORTUNITIES, CAUTIONS, RISKS, NEXT STEPS
  }
}
```

## Database Support

The SQLite schema supports both modes:

```sql
CREATE TABLE insights (
    type TEXT CHECK(type IN (
        -- Desktop mode
        'opportunity', 'caution', 'risk', 'next-step',
        -- Mobile mode
        'technique', 'advice', 'action-item', 'key-insight'
    ))
);
```

Meeting statistics view includes counts for both modes:

```sql
SELECT
    -- Desktop metrics
    SUM(CASE WHEN i.type = 'opportunity' THEN 1 END) as opportunities,
    SUM(CASE WHEN i.type = 'caution' THEN 1 END) as cautions,
    -- Mobile metrics
    SUM(CASE WHEN i.type = 'technique' THEN 1 END) as techniques,
    SUM(CASE WHEN i.type = 'advice' THEN 1 END) as advice_items
FROM meetings m
JOIN insights i ON m.id = i.meeting_id
```

## Testing Device Detection

### Manual Testing

Open the browser console and check device detection:

```javascript
import { detectDevice, logDeviceInfo } from './utils/device-detection';

// Log full device information
logDeviceInfo();

// Output example:
// 🔍 Device Detection: {
//   type: "mobile",
//   description: "Mobile Phone",
//   isMobile: true,
//   isPhone: true,
//   isTablet: false,
//   isDesktop: false,
//   userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS...)",
//   platform: "iPhone",
//   screenSize: "390x844",
//   touchSupport: true
// }
```

### Browser DevTools Testing

Test mobile mode on desktop using Chrome DevTools:

1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select a mobile device (iPhone, Pixel, etc.)
4. Reload the page
5. Check console for: `📱 Mode: MOBILE (Operational Recorder)`

### Override Detection (Development)

Force mobile mode for testing:

```typescript
// In realtime-client.ts constructor
this.isMobile = true; // Force mobile mode
```

Or force desktop mode:

```typescript
this.isMobile = false; // Force desktop mode
```

## Use Case Examples

### Mobile Mode Example 1: Workshop Recording

**Scenario:** Recording a 2-hour UX design workshop

**Setup:**
- Place phone on table
- Open app in mobile browser
- Grant microphone permission
- Start recording

**Expected Output:**

**TECHNIQUES MENTIONED:**
- Double Diamond design process
- User journey mapping methodology
- Persona development framework
- A/B testing principles

**ADVICE GIVEN:**
- Always validate assumptions with real users
- Start with low-fidelity prototypes
- Focus on user needs, not features
- Iterate based on feedback

**ACTION ITEMS:**
- Schedule user interviews next week
- Create initial wireframes by Friday
- Set up A/B test framework
- Document persona research findings

**KEY INSIGHTS:**
- User pain points centered around navigation
- Mobile-first approach preferred by target audience
- Budget constraints favor iterative approach
- Timeline aggressive but achievable

### Mobile Mode Example 2: Expert Interview

**Scenario:** Recording a 1-hour interview with a data science expert

**Expected Output:**

**TECHNIQUES MENTIONED:**
- Random Forest algorithm for classification
- Cross-validation for model evaluation
- Feature engineering best practices
- Gradient boosting for prediction tasks

**ADVICE GIVEN:**
- Start with simpler models before complex ones
- Focus on data quality over model complexity
- Document all preprocessing steps
- Use version control for notebooks

**ACTION ITEMS:**
- Review scikit-learn documentation
- Clean dataset and handle missing values
- Experiment with different feature combinations
- Set up MLflow for experiment tracking

**KEY INSIGHTS:**
- Data quality more important than model choice
- 80% of time should be spent on data preparation
- Model interpretability matters for stakeholder buy-in
- Start with baseline model for comparison

## Comparison Table

| Feature | Desktop Mode | Mobile Mode |
|---------|-------------|-------------|
| **Primary Focus** | Real-time strategic advice | Accurate transcription |
| **Audio Source** | Screen share + Mic | Microphone only |
| **Insight Timing** | Real-time | Post-meeting synthesis |
| **Use Case** | Virtual meetings | In-person recordings |
| **Insight Categories** | B2B Strategic (4) | Operational (4) |
| **Best For** | Sales, negotiations | Training, knowledge capture |
| **Device** | Laptop, PC | Phone, tablet |
| **Detection** | Automatic | Automatic |

## Future Enhancements

- [ ] Add manual mode toggle in UI
- [ ] Support hybrid mode (both insight types)
- [ ] Add speaker diarization for mobile mode
- [ ] Implement audio quality detection
- [ ] Add noise cancellation for mobile recordings
- [ ] Support external microphones on mobile
- [ ] Add meeting templates per mode
- [ ] Implement custom insight categories per mode

## Troubleshooting

### Mobile Mode Not Activating

**Problem:** Using phone but getting desktop mode

**Solution:**
1. Check console logs for device detection
2. Ensure not using "Request Desktop Site" in browser
3. Clear browser cache and reload
4. Try different mobile browser (Chrome, Safari, Firefox)

### Poor Audio Quality on Mobile

**Problem:** Transcription inaccurate

**Solution:**
1. Move phone closer to speakers
2. Reduce background noise
3. Use external microphone if available
4. Ensure phone not in low-power mode
5. Close other apps to free resources

### Missing Operational Insights

**Problem:** Transcripts work but no insights generated

**Solution:**
1. Ensure meeting runs for at least 5 minutes
2. Check that conversation contains actionable content
3. Review OpenAI API response in console
4. Verify insight patterns match expected format

## Summary

The dual-mode operation makes the Meetings Agent versatile:

**Desktop Mode** = Real-time B2B strategy advisor for virtual meetings
**Mobile Mode** = Operational recorder for in-person knowledge capture

Both modes save data to the same database, allowing you to build a comprehensive meeting archive regardless of device or scenario.
