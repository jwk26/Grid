import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { createPortal } from "react-dom";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useInertBody } from "@/hooks/use-inert-body";

function Cover({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useInertBody(ref);
  return createPortal(<div ref={ref} data-cover={name} />, document.body);
}

const app = () => document.getElementById("app")!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useInertBody", () => {
  function setup() {
    document.body.innerHTML = '<div id="app"></div>';
  }

  it("makes the page inert and gives it back", () => {
    setup();
    const { unmount } = render(<Cover name="a" />);
    expect(app()).toHaveAttribute("inert");
    expect(document.querySelector('[data-cover="a"]')).not.toHaveAttribute("inert");
    unmount();
    expect(app()).not.toHaveAttribute("inert");
  });

  it("keeps the page inert until the last of two covers goes, first mounted leaving first", () => {
    setup();
    const first = render(<Cover name="a" />);
    const second = render(<Cover name="b" />);
    first.unmount();
    expect(app()).toHaveAttribute("inert");
    second.unmount();
    expect(app()).not.toHaveAttribute("inert");
  });

  it("keeps the page inert until the last of two covers goes, last mounted leaving first", () => {
    setup();
    const first = render(<Cover name="a" />);
    const second = render(<Cover name="b" />);
    second.unmount();
    expect(app()).toHaveAttribute("inert");
    first.unmount();
    expect(app()).not.toHaveAttribute("inert");
  });

  it("leaves an element that was inert before any cover alone", () => {
    document.body.innerHTML = '<div id="app" inert></div>';
    const { unmount } = render(<Cover name="a" />);
    unmount();
    expect(app()).toHaveAttribute("inert");
  });

  it("skips an element marked data-inert-exempt", () => {
    document.body.innerHTML = '<div id="app"></div><div id="panel" data-inert-exempt=""></div>';
    const { unmount } = render(<Cover name="a" />);
    expect(document.getElementById("panel")).not.toHaveAttribute("inert");
    unmount();
  });
});
