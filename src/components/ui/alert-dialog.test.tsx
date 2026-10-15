import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "./alert-dialog";

afterEach(cleanup);

function renderDialog(overlayClassName?: string) {
  render(
    <AlertDialog open>
      <AlertDialogContent overlayClassName={overlayClassName}>
        <AlertDialogTitle>Title</AlertDialogTitle>
        <AlertDialogDescription>Body</AlertDialogDescription>
      </AlertDialogContent>
    </AlertDialog>,
  );
  return document.querySelector('[data-slot="alert-dialog-overlay"]');
}

describe("AlertDialogContent overlayClassName", () => {
  it("keeps the existing overlay classes when no overlayClassName is given", () => {
    const overlay = renderDialog();
    expect(overlay?.className).toBe(
      "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("appends overlayClassName to the overlay only", () => {
    const overlay = renderDialog("scratch-trash-overlay");
    expect(overlay).toHaveClass("scratch-trash-overlay", "fixed", "inset-0");
    expect(screen.getByRole("alertdialog")).not.toHaveClass(
      "scratch-trash-overlay",
    );
  });
});
