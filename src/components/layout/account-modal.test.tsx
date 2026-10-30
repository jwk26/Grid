import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountModal } from "@/components/layout/account-modal";
import type { AccountDeletionResult } from "@/lib/auth/session";
import { ACCOUNT_MODAL, toastCopy } from "@/lib/copy/feedback";

const showToast = vi.hoisted(() => vi.fn());
vi.mock("@/lib/feedback/toast", () => ({ showToast }));

function controller(overrides: Partial<{ result: AccountDeletionResult; name: string | null }> = {}) {
  return {
    signOut: vi.fn(async () => undefined),
    requestAccountDeletion: vi.fn(async (): Promise<AccountDeletionResult> => overrides.result ?? "requested"),
    getAccountName: () => (overrides.name === undefined ? "Ada Lovelace" : overrides.name),
  };
}

function mount(variant: "guest" | "account", c = controller(), extra: { signInError?: string | null } = {}) {
  const onOpenChange = vi.fn();
  render(<AccountModal variant={variant} open onOpenChange={onOpenChange} controller={c as never} {...extra} />);
  return { c, onOpenChange };
}

beforeEach(() => showToast.mockClear());
afterEach(cleanup);

describe("AccountModal, guest", () => {
  it("states the guest facts and the privacy note, with no sign-out and no delete", () => {
    mount("guest");
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(ACCOUNT_MODAL.guest.heading);
    expect(screen.getByText(ACCOUNT_MODAL.guest.retention)).toBeInTheDocument();
    expect(screen.getByText(ACCOUNT_MODAL.guest.signInNote)).toBeInTheDocument();
    expect(screen.getByText(ACCOUNT_MODAL.privacy)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACCOUNT_MODAL.account.signOut })).toBeNull();
    expect(screen.queryByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount })).toBeNull();
  });

  it("holds the inline sign-in error in a status line, empty when there is none", () => {
    mount("guest", controller(), { signInError: ACCOUNT_MODAL.guest.signInError });
    expect(screen.getByRole("status")).toHaveTextContent(ACCOUNT_MODAL.guest.signInError);
    cleanup();
    mount("guest");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("closes from its Close button", () => {
    const { onOpenChange } = mount("guest");
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.close }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("AccountModal, account", () => {
  it("is titled with the account name and offers Delete account and Sign out", () => {
    mount("account");
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Ada Lovelace");
    expect(screen.getByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ACCOUNT_MODAL.account.signOut })).toBeInTheDocument();
    expect(screen.queryByText(ACCOUNT_MODAL.guest.retention)).toBeNull();
  });

  it("falls back to Account for a nameless account", () => {
    mount("account", controller({ name: null }));
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Account");
  });

  it("signs out through the controller", () => {
    const { c } = mount("account");
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.account.signOut }));
    expect(c.signOut).toHaveBeenCalledTimes(1);
  });

  it("asks before deleting, and Cancel goes back without a request", () => {
    const { c } = mount("account");
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAccessibleName(ACCOUNT_MODAL.confirm.title);
    expect(within(dialog).getByText(ACCOUNT_MODAL.confirm.body)).toBeInTheDocument();
    expect(c.requestAccountDeletion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.cancel }));
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Ada Lovelace");
    expect(c.requestAccountDeletion).not.toHaveBeenCalled();
  });

  it("a recorded request shows the fallback toast", async () => {
    const { c } = mount("account");
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount }));
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.delete }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(toastCopy.accountDeletionScheduled));
    expect(c.requestAccountDeletion).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while the request is open", async () => {
    let finish: (value: AccountDeletionResult) => void = () => undefined;
    const c = controller();
    c.requestAccountDeletion.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    mount("account", c);
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount }));
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.delete }));
    expect(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.delete })).toBeDisabled();
    expect(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.cancel })).toBeDisabled();
    expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-busy", "true");
    await act(async () => finish("requested"));
  });

  it.each<AccountDeletionResult>(["failed", "unknown"])(
    "a %s request keeps the dialog, says so inline and shows no toast",
    async (result) => {
      mount("account", controller({ result }));
      fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount }));
      fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.delete }));
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(ACCOUNT_MODAL.confirm.deleteFailed));
      expect(showToast).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.delete })).toBeEnabled();
    },
  );
});

describe("AccountModal focus", () => {
  it("moves focus to Cancel on the confirmation and back to Delete account when it is cancelled", async () => {
    mount("account");
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount }));
    await waitFor(() => expect(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.cancel })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_MODAL.confirm.cancel }));
    await waitFor(() => expect(screen.getByRole("button", { name: ACCOUNT_MODAL.account.deleteAccount })).toHaveFocus());
  });
});
