"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, LogOut, Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { errorMessage } from "../data";
import { QuadraticLogo, WorkspaceIcon } from "../icons";
import { newSessionToken } from "../session";
import { Button, Field, TextInput } from "./primitives";

export function AuthFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="q-scroll flex h-full flex-col items-center justify-center bg-q-panel px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(94,106,210,0.18),transparent_65%)]" />
      <div className="relative w-full max-w-[380px]">
        <div className="mb-8 flex justify-center">
          <QuadraticLogo size={44} />
        </div>
        {children}
      </div>
      {footer ? <div className="relative mt-10 text-center text-[12px] text-q-text4">{footer}</div> : null}
    </div>
  );
}

export function SignUp({ onSignedUp, heading }: { onSignedUp: (token: string) => void; heading?: string }) {
  const signUp = useMutation(api.quadratic.users.signUp);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const token = newSessionToken();
    try {
      await signUp({ token, name, email: email || undefined });
      onSignedUp(token);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <AuthFrame
      footer={
        <>
          Quadratic is a Linear-style issue tracker built on Convex.
          <br />
          No passwords: your session lives in this browser.
        </>
      }
    >
      <h1 className="text-center text-[22px] font-semibold tracking-[-0.01em] text-q-text">{heading ?? "Welcome to Quadratic"}</h1>
      <p className="mt-2 text-center text-q-text3">Plan, track and ship great products. Let's set up your account.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Full name">
          <TextInput autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Lovelace" className="h-10" />
        </Field>
        <Field label="Email (optional)">
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ada@company.com" className="h-10" />
        </Field>
        {error ? <p className="text-[12px] text-[#eb5757]">{error}</p> : null}
        <Button type="submit" variant="primary" size="md" className="h-10 w-full" disabled={!name.trim() || busy}>
          Continue
          <ArrowRight size={14} />
        </Button>
      </form>
    </AuthFrame>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function CreateWorkspace({ token, onCreated, onCancel }: { token: string; onCreated: (slug: string) => void; onCancel?: () => void }) {
  const create = useMutation(api.quadratic.workspaces.create);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finalSlug = slugEdited ? slug : slugify(name);
  const available = useQuery(api.quadratic.workspaces.slugAvailable, finalSlug.length >= 2 ? { slug: finalSlug } : "skip");
  const host = typeof window !== "undefined" ? window.location.host : "";
  return (
    <AuthFrame>
      <h1 className="text-center text-[22px] font-semibold tracking-[-0.01em] text-q-text">Create a new workspace</h1>
      <p className="mt-2 text-center text-q-text3">Workspaces are shared environments where teams work on projects, cycles and issues.</p>
      <form
        className="mt-8 space-y-4 rounded-[12px] border border-q-border bg-q-raised p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || !finalSlug) return;
          setBusy(true);
          setError(null);
          try {
            onCreated(await create({ token, name, slug: finalSlug }));
          } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
          }
        }}
      >
        <Field label="Workspace name">
          <TextInput autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme Inc." className="h-10" />
        </Field>
        <Field
          label="Workspace URL"
          hint={
            finalSlug.length >= 2 && available !== undefined ? (
              available ? (
                <span className="inline-flex items-center gap-1 text-[#4cb782]">
                  <Check size={12} /> Available
                </span>
              ) : (
                <span className="text-[#eb5757]">That URL is taken</span>
              )
            ) : undefined
          }
        >
          <div className="flex h-10 items-center rounded-[6px] border border-q-border bg-q-panel pl-2.5 text-q-text3 focus-within:border-q-accent">
            <span className="shrink-0 text-[13px]">{host}/quadratic/</span>
            <input
              value={finalSlug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
              className="h-full min-w-0 flex-1 bg-transparent pr-2.5 text-[13px] text-q-text outline-none"
            />
          </div>
        </Field>
        {error ? <p className="text-[12px] text-[#eb5757]">{error}</p> : null}
        <Button type="submit" variant="primary" size="md" className="h-10 w-full" disabled={!name.trim() || finalSlug.length < 2 || available === false || busy}>
          Create workspace
        </Button>
      </form>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="mx-auto mt-4 block text-[12px] text-q-text3 hover:text-q-text">
          Back
        </button>
      ) : null}
    </AuthFrame>
  );
}

export function WorkspacePicker({
  token,
  forceChooser,
  onOpen,
  onSignOut,
}: {
  token: string;
  forceChooser: boolean;
  onOpen: (slug: string) => void;
  onSignOut: () => void;
}) {
  const me = useQuery(api.quadratic.users.me, { token });
  const workspaces = useQuery(api.quadratic.workspaces.mine, { token });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (forceChooser || !workspaces || !me) return;
    const last = workspaces.find((w) => w._id === me.lastWorkspaceId) ?? workspaces[0];
    if (last) onOpen(last.slug);
  }, [forceChooser, me, onOpen, workspaces]);

  useEffect(() => {
    // The session was revoked or the database reset.
    if (me === null) onSignOut();
  }, [me, onSignOut]);

  if (me === null) return null;
  if (!workspaces || !me) return <LoadingScreen />;
  if (creating || workspaces.length === 0) {
    return <CreateWorkspace token={token} onCreated={onOpen} onCancel={workspaces.length ? () => setCreating(false) : undefined} />;
  }
  if (!forceChooser) return <LoadingScreen />;
  return (
    <AuthFrame>
      <h1 className="text-center text-[22px] font-semibold text-q-text">Choose a workspace</h1>
      <p className="mt-2 text-center text-q-text3">Signed in as {me.name}</p>
      <div className="mt-8 overflow-hidden rounded-[12px] border border-q-border bg-q-raised">
        {workspaces.map((workspace) => (
          <button
            key={workspace._id}
            type="button"
            onClick={() => onOpen(workspace.slug)}
            className="flex h-14 w-full items-center gap-3 border-b border-q-line px-4 text-left hover:bg-q-hover"
          >
            <WorkspaceIcon name={workspace.name} size={28} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-q-text">{workspace.name}</div>
              <div className="text-[12px] text-q-text3">/{workspace.slug}</div>
            </div>
            <ArrowRight size={14} className="text-q-text3" />
          </button>
        ))}
        <button type="button" onClick={() => setCreating(true)} className="flex h-12 w-full items-center gap-3 px-4 text-left text-q-text2 hover:bg-q-hover">
          <Plus size={15} />
          Create a new workspace
        </button>
      </div>
      <button type="button" onClick={onSignOut} className="mx-auto mt-5 flex items-center gap-1.5 text-[12px] text-q-text3 hover:text-q-text">
        <LogOut size={12} /> Log out
      </button>
    </AuthFrame>
  );
}

export function JoinWorkspace({
  token,
  inviteCode,
  onJoined,
  onNeedAccount,
}: {
  token: string | null;
  inviteCode: string;
  onJoined: (slug: string) => void;
  onNeedAccount: (token: string) => void;
}) {
  const preview = useQuery(api.quadratic.workspaces.invitePreview, { inviteCode });
  const join = useMutation(api.quadratic.workspaces.join);
  const [error, setError] = useState<string | null>(null);
  if (preview === undefined) return <LoadingScreen />;
  if (preview === null) {
    return (
      <AuthFrame>
        <h1 className="text-center text-[20px] font-semibold text-q-text">Invite link expired</h1>
        <p className="mt-2 text-center text-q-text3">Ask a workspace admin for a new invite link.</p>
      </AuthFrame>
    );
  }
  if (!token) return <SignUp heading={`Join ${preview.name} on Quadratic`} onSignedUp={onNeedAccount} />;
  return (
    <AuthFrame>
      <div className="flex justify-center">
        <WorkspaceIcon name={preview.name} size={48} />
      </div>
      <h1 className="mt-4 text-center text-[22px] font-semibold text-q-text">Join {preview.name}</h1>
      <p className="mt-2 text-center text-q-text3">
        {preview.memberCount} {preview.memberCount === 1 ? "member" : "members"} · /{preview.slug}
      </p>
      {error ? <p className="mt-4 text-center text-[12px] text-[#eb5757]">{error}</p> : null}
      <Button
        variant="primary"
        size="md"
        className="mt-8 h-10 w-full"
        onClick={async () => {
          try {
            onJoined(await join({ token, inviteCode }));
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        Join workspace
      </Button>
    </AuthFrame>
  );
}

export function RedeemLogin({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const redeem = useMutation(api.quadratic.users.redeemLoginCode);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const code = window.location.hash.slice(1);
    if (!code) {
      setError("This sign-in link is incomplete.");
      return;
    }
    const token = newSessionToken();
    redeem({ code, token })
      .then(() => {
        window.history.replaceState(null, "", "/quadratic");
        onSignedIn(token);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [onSignedIn, redeem]);
  return (
    <AuthFrame>
      <h1 className="text-center text-[20px] font-semibold text-q-text">{error ? "Couldn't sign you in" : "Signing you in…"}</h1>
      {error ? <p className="mt-2 text-center text-q-text3">{error}</p> : null}
    </AuthFrame>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center bg-q-panel">
      <div className="animate-pulse">
        <QuadraticLogo size={40} />
      </div>
    </div>
  );
}
