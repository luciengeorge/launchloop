/** Editorial examples based on the frozen README sources. Not published posts or kit outputs. */
export const LINKEDIN_TEMPLATE = `[Product] helps [specific person] do [specific job].

[One concrete problem, in your own words.]

[What the product does, supported by a demo or your docs.]

Try it: [public product or repo URL]

[One question about the job you want feedback on.]`;

export const LINKEDIN_EXAMPLES = [
  {
    id: "sonner",
    name: "Sonner",
    structure: "Feature-led",
    repo: "emilkowalski/sonner",
    sha: "8e4662b39255120b62138312058f5d77c0139a5e",
    evidence: "The README describes an opinionated toast component for React. Its usage example adds Toaster, then calls toast().",
    edit: "Replace the repo URL with your own working demo if readers need to see the interaction first.",
    text: `Meet Sonner, a toast component for React.

If your app needs a notification after an action, this is a place to start.

Add Toaster to your app, then call toast() with the message you want to show. The README includes a button example you can try in your own project.

Code and setup: https://github.com/emilkowalski/sonner

What would you want to check before adding a toast component to your app?`,
  },
  {
    id: "zustand",
    name: "Zustand",
    structure: "Demo-led",
    repo: "pmndrs/zustand",
    sha: "9fed2eb2f3af672da9f7bf694b996df3831fc207",
    evidence: "The README creates a store with create(), consumes it as a hook and says no providers are needed.",
    edit: "Attach a recording of a real store update if you have one. Do not describe a demo you have not made.",
    text: `A React store you read through a hook, without a provider wrapper.

That is the starting point for Zustand.

The README walks through a store with a counter and actions. Components select the state they need from the hook, and state changes update the view.

Start with that example: https://github.com/pmndrs/zustand

Which part of your app's state would you try it on first?`,
  },
  {
    id: "nanoid",
    name: "Nano ID",
    structure: "Usage-led",
    repo: "ai/nanoid",
    sha: "055d1700cc67ac843e3efb5235d806b419ec7b2b",
    evidence: "The README describes a URL-friendly string ID generator for JavaScript and demonstrates importing and calling nanoid().",
    edit: "Name your actual use case. Avoid adding speed or security comparisons unless you can support the precise claim.",
    text: `Need a URL-friendly string ID in JavaScript?

Nano ID generates one with a call to nanoid(). Import the function, call it where you need an ID, and use the result in your application.

The README also covers custom alphabets and sizes, with notes on the trade-offs. Read those before changing the defaults.

Code and examples: https://github.com/ai/nanoid

Where would this fit in your project?`,
  },
] as const;
