## @subscribe.dev/react

Subscribe.dev is a platform for building AI‑powered applications with integrated authentication, billing, usage tracking, storage, and access to 100+ curated AI models.

This document is a concise guide to installing, integrating, and using the React SDK.

### Requirements

- Use within a React app and wrap your app with the provider.
- Provide a public project token via environment variable.
- **React Version Compatibility**: React 18.x or older is required.

> ⚠️ This SDK requires React 18. React 19+ is not supported and must be avoided, as it causes compatibility issues. If you encounter errors related to React version compatibility such as `ReactCurrentDispatcher`, ensure you are using React 18.

### Vite & Node Compatibility

If you're using Vite or Node, follow these guidelines:

#### Environment Variables
- The VITE_SUBSCRIBE_DEV_PROJECT_TOKEN is available in the build step that the user does manually, so do not leave any traces of mock or placeholder implementations where the token is needed.

#### React Version
Vite and Node projects support React 18 and newer. If you encounter errors related to React version compatibility, ensure you are using React 18+.

```bash
npm install @subscribe.dev/react react@^18.2.0 react-dom@^18.2.0
```

#### Provider Setup for Vite/Node

```tsx
import { SubscribeDevProvider } from '@subscribe.dev/react';

function App() {
  return (
    <SubscribeDevProvider projectToken={import.meta.env.VITE_SUBSCRIBE_DEV_PROJECT_TOKEN}>
      <YourApp />
    </SubscribeDevProvider>
  );
}
```

### Getting Started

1) Install

```bash
npm install @subscribe.dev/react
```

2) **CRITICAL: Ensure React Version Compatibility**

⚠️ **For Vite/Node users**: This package requires React 18+. If you encounter errors related to React version compatibility, ensure you are using React 18 or newer:

```bash
npm rm react react-dom
npm install react@^18.2.0 react-dom@^18.2.0
rm -rf node_modules && npm install
```

3) Add the provider

**For Vite/Node projects:**
```tsx
import { SubscribeDevProvider } from '@subscribe.dev/react';

export function App() {
  return (
    <SubscribeDevProvider projectToken={import.meta.env.VITE_SUBSCRIBE_DEV_PROJECT_TOKEN}>
      <AIApplication />
    </SubscribeDevProvider>
  );
}
```

4) Gate by authentication and run a model

```tsx
import { useSubscribeDev } from '@subscribe.dev/react';

function AIApplication() {
  const {
    isSignedIn,
    signIn,
    signOut,
    client, // null when not signed in
    usage, // null when not signed in
    subscribe, // null when not signed in
    subscriptionStatus, // null when not signed in
  } = useSubscribeDev();

  if (!isSignedIn) {
    return (
      <div>
        Please sign in to continue
        <button onClick={signIn}>Sign Up</button>
        <button onClick={signIn}>Sign In</button>
      </div>
    );
  }

  const generateImage = async () => {
    if (!client) return;
    try {
      const { output } = await client.run('black-forest-labs/flux-schnell', {
        input: { prompt: 'A beautiful landscape', width: 1024, height: 1024 }
      });
      console.log('Image URL:', output[0]);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <div>
      <button onClick={generateImage}>Generate Image</button>
      <button onClick={subscribe!}>Manage Subscription</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

5) Handle errors

```tsx
const handleAIRequest = async () => {
  if (!client) return;
  try {
    const { output } = await client.run('openai/gpt-4o', {
      input: { messages: [{ role: 'user', content: 'Hello, world!' }] }
    });
    console.log(output[0]);
  } catch (error) {
    if (error.type === 'insufficient_credits') {
      // Show upgrade prompt
    } else if (error.type === 'rate_limit_exceeded') {
      // Show retry timer using error.retryAfter
    } else {
      // Generic friendly error
    }
  }
};
```

6) Show usage and plan status

```tsx
const { usage, subscriptionStatus } = useSubscribeDev();
return (
  <div>
    <p>Credits: {usage?.remainingCredits ?? 0} remaining</p>
    <p>Plan: {subscriptionStatus?.plan?.name ?? 'Free'}</p>
  </div>
);
```

### API Reference

#### useSubscribeDev()

Must be called inside SubscribeDevProvider.

Returns:
- isSignedIn: boolean
- signIn: () => void
- signOut: () => void
- client: SubscribeDevClient | null
- user: UserObject | null
- usage: UsageInfo | null
- subscribe: (() => void) | null
- subscriptionStatus: SubscriptionStatus | null
- useStorage: `<T>(key: string, defaultValue: T) => [T, (value: T) => void, StorageSyncStatus] | null`

Notes:
- When not signed in, client, usage, subscribe, subscriptionStatus, and useStorage are null.
- Call signIn() to authenticate before using user‑specific APIs.

#### SubscribeDevClient

- run(model: string, params: RunParameters): `Promise<{ output: Array<string | Record<string, any>> }>`

RunParameters:
- input: A union of text/multimodal or image/video input. Common fields:
  - width?: number (image models; default 1024)
  - height?: number (image models; default 1024)
  - image?: string (base64 data URL or a URL; model-dependent)
  - Either:
    - prompt?: string (text and image models), or
    - messages: <code>
    Array\<
        \{ role: string; content: string \} |
        \{
          type: 'text' \| 'image_url'\;
          text?: string\;
          image_url?: \{ url: string; detail?: 'low' | 'high' | 'auto' \}\;
        \}
      \></code>
- response_format?:
  - `{ type: 'json_object' }` for “any JSON” outputs, or
  - `{ type: 'json_schema'; json_schema: { name: string; strict?: boolean; schema: Record<string, unknown> } }`, or
  - ZodObject (pass a Zod schema directly).

Model‑specific parameters:
- Some models accept additional fields beyond the above (e.g., aspect_ratio for video, input_image for certain image‑to‑image models). See “Model‑specific parameters” below.

#### Types

```ts
export type UserObject = {
  userId: string;
  email: string;
  avatarUrl?: string;
};

export type SubscriptionStatus = {
  hasActiveSubscription: boolean;
  plan?: {
    id: string;
    name: string;
    price: number;
  };
  status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'none';
};

export type UsageInfo = {
  allocatedCredits: number;
  usedCredits: number;
  remainingCredits: number;
};

export type StorageSyncStatus = 'local' | 'syncing' | 'synced' | 'error';
```

### Authentication

Sign In:
- Call signIn() from useSubscribeDev to start the built‑in auth flow.

```tsx
function SignInButton() {
  const { isSignedIn, signIn } = useSubscribeDev();
  if (isSignedIn) return <div>Welcome!</div>;
  return <button onClick={signIn}>Sign In</button>;
}
```

Sign Out:
- Call signOut() to clear the access token and return to an unauthenticated state.

Behavior after signOut:
- If a projectToken is provided to the provider, users return to project mode (signed out but running in your configured project).
- If no projectToken is provided, users return to demo mode (signed out, limited capabilities).

```tsx
function SignOutButton() {
  const { isSignedIn, signOut } = useSubscribeDev();
  if (!isSignedIn) return null;
  return <button onClick={signOut}>Sign Out</button>;
}
```

### Billing and Usage

- subscribe(): Opens a Stripe‑powered subscription/management flow in an iframe.
- subscriptionStatus: Reflects the user’s current plan and status; updates automatically.
- usage: Tracks credits (allocated, used, remaining); updates after AI requests.

Example:

```tsx
function BillingPanel() {
  const { isSignedIn, subscribe, subscriptionStatus, usage } = useSubscribeDev();

  if (!isSignedIn) return <p>Please sign in to manage your subscription.</p>;

  return (
    <div>
      <p>Plan: {subscriptionStatus?.plan?.name ?? 'Free'}</p>
      <p>Status: {subscriptionStatus?.status ?? 'none'}</p>
      <p>Credits: {usage?.remainingCredits ?? 0} remaining</p>
      <button onClick={subscribe!}>Manage Subscription</button>
    </div>
  );
}
```

### Storage

Persist per‑user data (cloud‑synced) with useStorage. The hook is available when signed in.

Signature:
- `const [value, setValue, syncStatus] = useStorage<T>(key, defaultValue)`
- syncStatus: 'local' | 'syncing' | 'synced' | 'error'

**IMPORTANT**: `useStorage` is `null` when not signed in. To avoid React Hooks rules violations, use component separation rather than conditional hook calls.

#### ✅ Correct Pattern (Component Separation):

```tsx
import { useSubscribeDev } from '@subscribe.dev/react';

// Sign-in screen component
function SignInScreen({ signIn }) {
  return (
    <div>
      Please sign in to use storage
      <button onClick={signIn}>Sign In</button>
    </div>
  );
}

// Component that uses storage (only renders when signed in)
function AppWithStorage() {
  const { useStorage, signOut } = useSubscribeDev();

  // useStorage is guaranteed to be available here
  const [state, setState, syncStatus] = useStorage('app-state', {
    lastState: '',
    counter: 0
  });

  const increment = () => {
    setState({
      ...state,
      counter: state.counter + 1,
      lastGeneratedAt: Date.now()
    });
  };

  return (
    <div>
      <p>Counter: {state.counter}</p>
      <p>Sync: {syncStatus}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

// Main component that handles conditional rendering
export function ServerPersistedCounter() {
  const { isSignedIn, signIn } = useSubscribeDev();

  if (!isSignedIn) {
    return <SignInScreen signIn={signIn} />;
  }

  return <AppWithStorage />;
}
```

#### ❌ Incorrect Pattern (Conditional Hook Calls):

```tsx
// DON'T DO THIS - violates React Hooks rules
export function BadExample() {
  const { isSignedIn, useStorage } = useSubscribeDev();

  // ❌ This will cause "React Hook called conditionally" errors
  const storageHook = useStorage ? useStorage('app-state', {}) : null;

  // ❌ This will also cause hook rule violations
  if (isSignedIn && useStorage) {
    const [state, setState] = useStorage('app-state', {});
    // ... rest of component
  }
}
```

### AI Generation

Use `client.run(model, { input, response_format? })` for text, image, and video generation. Always wrap calls in try/catch.

#### Text generation (default model: openai/gpt-4o)

```tsx
const { output: [text] } = await client.run('openai/gpt-4o', {
  input: {
    messages: [
      { role: 'system', content: 'You tell jokes.' },
      { role: 'user', content: 'Tell me a joke about dogs.' }
    ]
  }
});
console.log(text);
```

Multimodal (text + image input):

```tsx
const { output: [response] } = await client.run('openai/gpt-4o', {
  input: {
    messages: [
      { role: 'system', content: 'You identify stuff.' },
      { role: 'user', content: 'What is this image?' },
      { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } }
    ]
  }
});
console.log(response);
```

JSON output (free-form JSON):

```tsx
const { output: [obj] } = await client.run('openai/gpt-4o', {
  input: {
    messages: [
      {
        role: 'system',
        content:
`You create user avatars based on a description.

Schema shape (not enforced):
{
  "name": "string",
  "age": "number",
  "email": "string",
  "hobbies": ["string", ...]
}`
      },
      { role: 'user', content: 'A young artist' }
    ]
  },
  response_format: { type: 'json_object' }
});
console.log(obj);
```

JSON output (JSON Schema):

```tsx
const { output: [joke] } = await client.run('openai/gpt-4o', {
  input: { prompt: 'Tell me a joke about AI' },
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'Joke',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          setup: { type: 'string' },
          punchline: { type: 'string' }
        },
        required: ['setup', 'punchline']
      }
    }
  }
});
console.log(joke);
```

JSON output (Zod schema):

```tsx
import { z } from 'zod';

const jokeSchema = z.object({
  setup: z.string(),
  punchline: z.string()
});

const { output: [validatedJoke] } = await client.run('openai/gpt-4o', {
  input: { prompt: 'Tell me a joke about AI' },
  response_format: jokeSchema
});
console.log(validatedJoke);
```

#### Image generation

Prompt to image:

```tsx
const { output: [url] } = await client.run('black-forest-labs/flux-schnell', {
  input: { prompt: 'a cute dog', width: 512, height: 512 }
});
console.log('Image URL:', url);
```

Image‑to‑image (single reference; model‑specific):

```tsx
const { output: [twin] } = await client.run('black-forest-labs/flux-kontext-max', {
  input: {
    prompt: 'another cute dog that looks like this dog',
    input_image: 'https://example.com/dog.jpg' // base64 data URL also supported
  }
});
console.log('Twin URL:', twin);
```

Image‑to‑image (multiple references; model‑specific):

```tsx
const { output: [mix] } = await client.run('flux-kontext-apps/multi-image-kontext-max', {
  input: {
    prompt: 'a puppy that combines the characteristics of both dogs',
    input_image_1: 'https://example.com/dog1.jpg',
    input_image_2: 'https://example.com/dog2.jpg'
  }
});
console.log('Puppy URL:', mix);
```

#### Video generation (default model: wan-video/wan-2.2-5b-fast)

```tsx
// Example with optional init image (base64 data URL or URL)
const response = await client.run('wan-video/wan-2.2-5b-fast', {
  input: {
    prompt: 'a car is driving at speed along a runway, it leaves us in the dust',
    aspect_ratio: '16:9',
    image: 'https://example.com/frame.jpg' // or data:application/octet-stream;base64,AAAA...
  }
});
const [videoUrl] = response.output;
console.log('Video URL:', videoUrl);
```

#### Model‑specific parameters

Some models accept extra fields that are not part of the common typed input:
- black-forest-labs/flux-schnell: prompt, width, height, image (optional for img‑to‑img).
- black-forest-labs/flux-kontext-max: input_image (single reference).
- flux-kontext-apps/multi-image-kontext-max: input_image_1, input_image_2 (multiple references).
- wan-video/wan-2.2-5b-fast (and bytedance/seedance-1-lite): aspect_ratio, optional image.

Pass these fields inside input. The SDK forwards them to the model endpoint.

### Error Handling

All SDK functions can throw typed errors. Handle with try/catch and show user-friendly messages.

Common error shapes:
- type: 'insufficient_credits' — Not enough balance. Suggest upgrade via subscribe().
- type: 'rate_limit_exceeded' — Too many requests. Use error.retryAfter (ms) to show a retry timer.
- Network/other — Show a retry action and log the message for diagnostics.

Example:

```tsx
try {
  const { output } = await client.run('openai/gpt-4o', {
    input: { prompt: 'Hello!' }
  });
} catch (error) {
  switch (error.type) {
    case 'insufficient_credits':
      // prompt upgrade
      break;
    case 'rate_limit_exceeded':
      // use error.retryAfter
      break;
    default:
      // generic friendly message
  }
}
```

### Best Practices

1) Error handling: Wrap AI calls in try/catch.
2) Loading states: Show skeletons/spinners for long operations.
3) Cost awareness: Surface remainingCredits and prompt for upgrades as needed.
4) Storage sync: Display syncStatus and allow retry on 'error'.
5) Rate limiting: Respect retryAfter and disable actions temporarily.
6) Subscription gates: Use subscriptionStatus to enable/disable premium features.
7) React Hooks: Follow component separation pattern for conditional hooks (see React Hooks section below).

### React Hooks Best Practices

#### The Problem
Several hooks from `useSubscribeDev()` are `null` when not signed in:
- `client` - null when not signed in
- `usage` - null when not signed in
- `subscribe` - null when not signed in
- `subscriptionStatus` - null when not signed in
- `useStorage` - null when not signed in

Since `useStorage` itself is a React hook, calling it conditionally violates React's Rules of Hooks.

#### The Solution: Component Separation

**Always use component separation** to handle authentication states rather than conditional hook calls:

```tsx
import { useSubscribeDev } from '@subscribe.dev/react';

function AuthenticatedApp() {
  // All hooks are guaranteed to be available here
  const {
    client,
    usage,
    subscribe,
    subscriptionStatus,
    useStorage,
    signOut
  } = useSubscribeDev();

  const [data, setData, syncStatus] = useStorage('my-data', {});

  return (
    <div>
      <p>Credits: {usage.remainingCredits}</p>
      <p>Plan: {subscriptionStatus?.plan?.name ?? 'Free'}</p>
      <p>Sync: {syncStatus}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

function UnauthenticatedApp() {
  const { signIn } = useSubscribeDev();

  return (
    <div>
      <p>Please sign in to continue</p>
      <button onClick={signIn}>Sign In</button>
    </div>
  );
}

export function MyApp() {
  const { isSignedIn } = useSubscribeDev();

  return isSignedIn ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}
```

#### What NOT to Do

❌ **Never conditionally call hooks:**

```tsx
// DON'T DO THIS
function BadComponent() {
  const { isSignedIn, useStorage } = useSubscribeDev();

  // ❌ Violates Rules of Hooks
  const storage = useStorage ? useStorage('key', {}) : null;

  // ❌ Also violates Rules of Hooks
  if (isSignedIn && useStorage) {
    const [data, setData] = useStorage('key', {});
  }
}
```

❌ **Never call hooks in conditions, loops, or nested functions:**

```tsx
// DON'T DO THIS
function AnotherBadComponent() {
  const { isSignedIn, useStorage } = useSubscribeDev();

  if (isSignedIn) {
    // ❌ Hook call inside condition
    const [data, setData] = useStorage('key', {});
  }
}
```

#### Key Rules
1. **Component Separation**: Create separate components for authenticated vs unauthenticated states
2. **Consistent Hook Calls**: Hooks must be called in the same order on every render
3. **Top Level Only**: Only call hooks at the top level of your React function
4. **No Conditional Calls**: Never call hooks inside loops, conditions, or nested functions

### Build Tools Compatibility

#### Vite & Node

| Feature | Vite/Node |
|---------|----------|
| Environment Variables | `import.meta.env.VITE_*` |
| React Version Support | React 18+ |
| Environment File | `VITE_SUBSCRIBE_DEV_PROJECT_TOKEN=token` |
| Nodedle Tool | Vite/Node |
| Hot Reload | Built-in |
| Demo Mode Support | ✅ No token required |

### UX Requirements

Every app using Subscribe.dev must implement:

- Authentication UI
  - Sign in/out buttons
  - Show user email/avatar (from user object)
- Subscription management
  - Plan status indicator
  - Upgrade/manage subscription button
  - Usage metrics display
- Error handling
  - Insufficient balance → upgrade prompt
  - Rate limits → retry timer
  - Network errors → retry button
  - Auth errors → sign-in prompt/redirect
- Storage sync indicators
  - Show syncing/progress/errors
- Loading states
  - Skeletons/progress for generation

### Coding Guidelines

Use millisecond unix timestamps (number) for time values. Store them with useStorage.

```tsx
type GenMeta = { lastGeneratedAt?: number };

function Example() {
  const { isSignedIn, useStorage } = useSubscribeDev();
  if (!isSignedIn || !useStorage) return null;

  const [meta, setMeta] = useStorage<GenMeta>('gen-meta', {});

  const run = async () => {
    // ... run a model
    setMeta({ lastGeneratedAt: Date.now() });
  };

  const displayDate = meta.lastGeneratedAt ? new Date(meta.lastGeneratedAt) : null;

  return (
    <div>
      <button onClick={run}>Generate</button>
      {displayDate && <p>Last generated: {displayDate.toLocaleString()}</p>}
    </div>
  );
}
```

### Use Case Example: Multi‑Model App

```tsx
import { useState } from 'react';
import { useSubscribeDev } from '@subscribe.dev/react';

function MultiModalApp() {
  const { client, isSignedIn } = useSubscribeDev();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (prompt: string) => {
    if (!isSignedIn || !client) return;
    setLoading(true);
    try {
      const [imageResult, textResult] = await Promise.all([
        client.run('black-forest-labs/flux-schnell', {
          input: { prompt, width: 1024, height: 1024 }
        }),
        client.run('openai/gpt-4o', {
          input: {
            messages: [
              {
                role: 'user',
                content: `Describe what an image with this prompt would look like: "${prompt}"`
              }
            ]
          }
        })
      ]);

      setImage(imageResult.output[0] as string);
      setDescription(textResult.output[0] as string);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter a prompt"
        onKeyDown={e => {
          if (e.key === 'Enter') handleGenerate((e.target as HTMLInputElement).value);
        }}
      />
      <button onClick={() => {
        const el = document.querySelector<HTMLInputElement>('input[type="text"]');
        if (el) handleGenerate(el.value);
      }}>Generate</button>

      {loading && <p>Generating...</p>}

      {image && <img src={image} alt="Generated" width={512} height={512} />}
      {description && <p>{description}</p>}
    </div>
  );
}
```

### Troubleshooting

#### Installation & Setup Issues
- **Provider error**: Ensure all components that call useSubscribeDev are children of SubscribeDevProvider.

#### Authentication & API Issues
- **"Invalid token" or "JWT validation failed: invalid signature"**:
  - Your project token is invalid, expired, or corrupted
  - **Quick fix**: Use demo mode by removing the `projectToken` prop from `SubscribeDevProvider`
  - **Production fix**: Get a fresh Project Public Key from [subscribe.dev](https://subscribe.dev) dashboard
  - Ensure token starts with `pub_` and is copied completely
  - Update your `.env` file with the new token and restart your dev server

- **Null client/useStorage**: The user is not signed in. Call signIn() and gate functionality on isSignedIn.
- **Rate limits**: Inspect error.retryAfter and implement a retry timer.
- **Insufficient credits**: Prompt users to upgrade via subscribe().

#### React Hooks Issues
- **"React Hook called conditionally" errors**: You're calling `useStorage` (or other hooks) conditionally. Use component separation pattern instead (see React Hooks Best Practices section).
- **ESLint react-hooks/rules-of-hooks errors**: Follow the component separation pattern. Never call hooks inside conditions, loops, or nested functions.

#### Vite/Node Specific Issues
- **Blank screen with console errors**: Check browser console for specific error messages above. Common causes:
  - Wrong environment variable access pattern (see above)
  - React version incompatibility (see above)
  - Missing environment file or incorrect token format

#### Environment Variable Issues
- **Environment variables not loading**:
  - Ensure your `.env` file is in the project root
  - Restart development server after changing `.env`
  - For Vite/Node: Use `VITE_` prefix

### Notes

- Default models: openai/gpt-4o (text), black-forest-labs/flux-schnell (image), wan-video/wan-2.2-5b-fast (video). You can specify any supported model string.
- Model parameters vary; pass model‑specific options inside input as needed.

```tsx
// Final reference signatures
type Run = (model: string, params: {
  input: {
    width?: number;
    height?: number;
    image?: string;
  } & (
    { prompt?: string } |
    {
      messages: Array<
        { role: string; content: string } |
        { type: 'text' | 'image_url'; text?: string; image_url?: { url: string; detail?: 'low' | 'high' | 'auto' } }
      >;
    }
  );
  response_format?: (
    { type: 'json_object' } |
    {
      type: 'json_schema';
      json_schema: { name: string; strict?: boolean; schema: Record<string, unknown> };
    } |
    any // ZodObject
  );
}) => Promise<{ output: Array<string | Record<string, any>> }>;
```

Happy building!
