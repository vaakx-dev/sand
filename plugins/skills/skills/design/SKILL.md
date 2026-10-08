---
name: design
description: Use when creating, changing, or reviewing any user interface, including layout, typography, styling, and interaction design.
---

# Design

Make deliberate, opinionated choices that fit the subject and the person using
it. A working interface is the starting point. Its composition, typography,
and details should look considered, not assembled from a default template.

## No heading filler

This is a requirement, not a stylistic preference: one direct heading, then
content or controls. Do not add eyebrow labels, decorative subheadings,
section introductions, panel taglines, or explanatory captions by default.
Do not move the same filler beside the heading, into a badge, or below a button.

A heading that names a real subsection is useful. A second line restating the
heading is not. "Recent transactions" goes straight to filters and transactions;
it does not need "A selection of September activity" or a ledger disclaimer.
"My schedule" goes straight to saved items or an action to add one, not
"Your weekend, in the making". Use "Workshops", not another slogan about clay.

Delete redundant text rather than rewriting it. Keep actual content: dates,
prices, descriptions, field labels, units, and instructions needed to complete
a task. A necessary explanation must answer a specific question the person
needs answered to proceed. Layout and typography must work without filler.

## Ground the design

Inspect the existing interface and named references before choosing a direction.
Identify the audience, the main task, and the content that deserves attention.
Clarify missing information that would materially change the design.

Draw visual choices from the subject's materials, tools, culture, and content.
Use real content or realistic examples. Don't invent claims to fill a layout.
Preserve approved work and respect the medium's conventions. A terminal tool,
a desktop panel, and an exhibition website need different treatments.

## Plan the composition

Before implementation, propose a compact visual plan:

- Color: name the base, surface, text, accent, and state colors with actual
  values. Define their roles rather than collecting attractive swatches.
- Type: choose the families and specify sizes, weights, line heights, and
  spacing for the roles the interface needs.
- Layout: sketch the composition with realistic content. Define alignment,
  proportions, grouping, density, and how it changes in smaller spaces.
- Character: identify what makes this direction specific to the subject and
  where its strongest visual moment belongs.

Show concrete options and get agreement before implementing visual changes.
Keep proposals proportional to the scope. Review the plan against the brief;
revise choices that could have been made for any unrelated project.

## Make typography do the work

Choose typefaces deliberately. One family can be enough. If using two, give
them distinct, complementary roles. Respect an existing type system.

Establish a clear scale, not a collection of nearly identical sizes. Give
primary headings and important values enough size and weight to lead the eye.
Keep body text, controls, and supporting information comfortably readable at
actual display size. Quiet text should not become tiny or faint.

Treat prominent type as part of the composition. Tune its width, line breaks,
weight, and spacing using the actual words. Shorten copy or change the layout
before shrinking text to make it fit. Don't create hierarchy by making one
headline enormous and everything else miniature.

Keep prose lines generally below 80 characters and set line height for the
chosen face. Avoid habitual all-caps labels, excessive letter spacing,
monospace metadata, and highlighting one arbitrary word in a headline.

## Compose around the task

Choose what deserves the first view. An expressive introduction can establish
a subject; a working tool should open on useful content and controls.
Don't give every interface a hero, or every section the same card layout.

Group information people need to compare or act on together. Keep actions
near their objects and feedback near the action. Use shared alignment and
spacing to express relationships before adding containers and dividers.

Make deliberate use of scale and empty space. Avoid both evenly scattered
content and cramped panels. Smaller layouts need recomposition, not simply
smaller type or a stack of every desktop block. Don't let decorative height
push the task out of reach.

## Write interface copy

Don't narrate the interface or turn implementation notes into user-facing
caveats. Put development limitations in documentation; retain warnings that
affect a person's decisions. Name controls by their actions and use the same
vocabulary throughout a flow. Errors should explain recovery. Empty states
should give a next step, not introduce another slogan.

## Give character without template decoration

Spend boldness in one place and keep its surroundings disciplined. Typography,
imagery, color, or an interaction can carry the identity. Use subject-specific
assets rather than generic decoration that merely fills space.

Watch for habitual looks: cream with serif headings and terracotta accents;
black with neon accents; newspaper grids; identical rounded cards with soft
shadows and gradient washes. Use them when the brief calls for them, not as
a substitute for choosing a direction. The user's explicit direction wins.

Borders, numbering, labels, and icons should communicate something. Number
content when order matters. Don't append arrows to every action. Use motion
to explain changes; avoid automatic reveals and hover effects on everything.

## Build, inspect, revise

Follow the agreed plan and reuse its values consistently. Keep the
implementation simple and changes scoped. Preserve familiar controls and
existing capabilities.

Inspect the running interface at actual size, including relevant small and
large layouts. Check the first view, text wrapping, legibility, alignment,
density, and overflow. Compare with the references and agreed direction.

Before delivery, inspect every heading and its surrounding text in the
rendered interface, including dialogs and empty states. For each supporting
line, name the user question it answers. Delete it if the heading, content,
or control already answers that question. A build with redundant heading
stacks is unfinished even if its interaction tests pass. Remove decoration
competing with the main task.

Exercise the main flow and relevant loading, empty, error, disabled, and
success states. Check keyboard focus, contrast, input methods, and reduced
motion. Don't rely on color alone. Fix what the rendered result reveals;
passing tests does not establish visual quality. Say what you couldn't verify.
