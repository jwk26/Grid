import type { ReactNode, Ref } from "react";

// The text block of an app-level screen (SPEC §App-level screens; DESIGN_TOKENS `app-frame-title`,
// `app-frame-reason`, `app-frame-action`): the page's `h1`, one reason line and the actions. Shared
// by the app frame's `Screen` and the Grid's unavailable screen so both draw the same parts in every
// theme. It carries no focus rule: each owner decides when focus moves to the first action.
export function ScreenBlock({
  title,
  reason,
  actions,
  actionsRef,
}: {
  title: string;
  reason?: string;
  actions: ReactNode;
  actionsRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="grid max-w-[440px] place-self-center justify-items-center gap-3 text-center">
      <h1 className="text-xl font-semibold" data-app-role="app-frame-title">
        {title}
      </h1>
      {reason ? (
        <p className="text-sm text-muted-foreground" data-app-role="app-frame-reason">
          {reason}
        </p>
      ) : null}
      <div
        ref={actionsRef}
        className="flex flex-wrap justify-center gap-2 pt-1"
        data-app-role="app-frame-action"
      >
        {actions}
      </div>
    </div>
  );
}
