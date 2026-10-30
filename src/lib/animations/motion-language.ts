import type { Transition } from "motion/react";

export const motionDuration = {
  affordance: 0.15,
  layout: 0.25,
  modalEnter: 0.2,
  modalExit: 0.15,
  contentEnter: 0.12,
  contentExit: 0.1,
  searchExit: 0.1,
  itemExit: 0.2,
  completionExit: 0.3,
  theme: 0.3,
  breadcrumbUnfold: 0.26,
  breadcrumbFold: 0.35,
  breadcrumbFade: 0.3,
  homeLanding: 0.6,
} as const;

export const motionScale = {
  nodeHover: 1.05,
  nodeDrag: 1.1,
  sidebarDragTarget: 1.2,
  taskToss: 1.05,
  overlayInitial: 0.95,
  creationInitial: 0.85,
  deletionExit: 0.9,
  sinkingExit: 0.95,
  dayColumnCollapsed: 0.95,
} as const;

export const motionDistance = {
  sink: 8,
  itemExitY: 8,
  popupSlide: 16,
} as const;

export const motionZIndex = {
  nodeHover: 40,
  nodeDrag: 50,
} as const;

export const motionOpacity = {
  hidden: 0,
  visible: 1,
  sinkingExit: 0.5,
  dayColumnCollapsed: 0.7,
} as const;

export const motionShadow = {
  sidebarDragTarget: "0 0 20px hsl(var(--primary) / 0.45)",
  none: "0 0 0px hsl(var(--primary) / 0)",
} as const;

const scaleSpring = {
  type: "spring",
  stiffness: 550,
  damping: 30,
  restSpeed: 10,
} as const satisfies Transition;

const creationSpring = {
  type: "spring",
  stiffness: 400,
  damping: 25,
} as const satisfies Transition;

const taskTossSpring = {
  type: "spring",
  stiffness: 400,
  damping: 10,
} as const satisfies Transition;

const gridSnapSpring = {
  type: "spring",
  stiffness: 200,
  damping: 15,
} as const satisfies Transition;

const calendarSnapSpring = {
  type: "spring",
  stiffness: 250,
  damping: 20,
} as const satisfies Transition;

const dayColumnSpring = {
  type: "spring",
  stiffness: 300,
  damping: 20,
} as const satisfies Transition;

const sidebarSlideSpring = {
  type: "spring",
  stiffness: 380,
  damping: 30,
} as const satisfies Transition;

export const motionSpring = {
  scale: scaleSpring,
  creation: creationSpring,
  taskToss: taskTossSpring,
  gridSnap: gridSnapSpring,
  calendarSnap: calendarSnapSpring,
  dayColumn: dayColumnSpring,
  sidebarSlide: sidebarSlideSpring,
} as const;
