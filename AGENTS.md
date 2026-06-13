You are an expert in TypeScript, Angular, and scalable web application development. Write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking.
- Prefer type inference when the type is obvious.
- Avoid `any`; use `unknown` when a type is uncertain.

## Angular Best Practices

- Always use standalone components instead of NgModules.
- Do not set `standalone: true` in Angular decorators. It is the default in Angular v20+.
- Use SCSS for component and global styles. Create `.scss` files instead of plain `.css` files.
- Use SCSS features such as variables, mixins, modules, and nesting when they improve reuse and readability. Avoid deeply nested selectors.
- Use signals for local state management.
- Implement lazy loading for feature routes.
- Do not use `@HostBinding` or `@HostListener`. Define host bindings in the decorator's `host` object.
- Use `NgOptimizedImage` for static images. It does not support inline base64 images.

## Accessibility Requirements

- All implementations must pass AXE checks.
- Meet WCAG AA requirements, including keyboard access, focus management, color contrast, semantic HTML, and appropriate accessible names.
- Prefer native HTML semantics. Add ARIA only when native semantics are insufficient.

## Components

- Keep components small and focused on one responsibility.
- Use `input()` and `output()` instead of decorator-based inputs and outputs.
- Use `computed()` for derived state.
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in every component.
- Prefer inline templates for small components.
- Prefer reactive forms over template-driven forms.
- Do not use `ngClass`; use class bindings.
- Do not use `ngStyle`; use style bindings.
- Use paths relative to the component TypeScript file for external templates and styles.

## State Management

- Use signals for local component state.
- Use `computed()` for derived state.
- Keep state transformations pure and predictable.
- Do not use `mutate` on signals; use `update` or `set`.

## Templates

- Keep templates simple and avoid complex template logic.
- Use native control flow (`@if`, `@for`, `@switch`) instead of structural directives.
- Use the async pipe for observables.
- Do not assume browser or JavaScript globals such as `new Date()` are available in templates.

## Services

- Design services around one responsibility.
- Use `providedIn: 'root'` for singleton services.
- Use `inject()` instead of constructor injection.

## Figma to Code

When implementing a UI from a Figma design, screenshot, or visual specification, modify the existing Angular project directly and follow its established component and styling patterns.

### Visual Fidelity

- Match the visible layout, spacing, alignment, sizing, borders, radii, shadows, typography, colors, and content hierarchy as closely as possible.
- Implement styling in SCSS format and follow the project's existing SCSS structure, variables, mixins, and design tokens.
- Preserve visible wording, capitalization, punctuation, labels, and button text.
- Do not invent sections, copy, links, controls, icons, or decorative elements that are not visible or explicitly requested.
- If text is unreadable, cropped, or ambiguous, use a concise placeholder or code comment instead of guessing.
- Prefer existing project design tokens and shared styles when they accurately represent the design.

### Responsive Layout

- Implement mobile, tablet, and desktop behavior, even when only one viewport is shown.
- Prefer normal document flow, Flexbox, and CSS Grid.
- Use absolute positioning only when the design genuinely requires layering.
- Prevent horizontal overflow, clipped controls, and unreadable content at narrow widths.

### Images and Assets

- Do not generate, download, search for, or add image assets unless the user explicitly requests it.
- Do not replace design imagery with AI-generated or unrelated stock imagery.
- If the user provides an asset filename or path, use it exactly.
- If no filename is provided, choose a clear descriptive filename and reference its expected project path, for example `/images/cocoa-farmer-mission.png`.
- Do not create a placeholder image file. The user will add the actual asset later.
- State every expected placeholder filename and path in the final response.
- Use `NgOptimizedImage` for static image references and provide meaningful alt text. Use an empty alt attribute only for genuinely decorative images.
- Prefer existing icon libraries or project assets. A simple inline SVG or CSS shape is acceptable for generic decorative symbols.
- Do not fabricate third-party brand logos. Use text labels or named placeholder paths when official assets are unavailable.

### Content and Interaction

- Implement only interactions visible in the design or explicitly requested.
- Ensure interactive elements are keyboard accessible and have visible focus states.
- Maintain WCAG AA contrast and support reduced-motion preferences for nonessential animation.
- Carousels and marquees must be pausable and must not duplicate announcements for assistive technology.

### Implementation Quality

- Integrate the design into the requested existing component unless separation provides a clear responsibility or reuse benefit.
- Keep components focused and avoid unnecessary wrappers, abstractions, dependencies, and unused styles.
- Do not create, update, or run automated tests unless the user explicitly requests testing.
- Verify implementations with the relevant production build unless the user asks to skip verification.
- Summarize changed files, build results, and placeholder asset paths in the final response.

### Final Reminder

Match the provided design as closely as possible. Do not hallucinate content or generate missing assets. Use only what is visible in the design, already available in the project, or explicitly provided by the user.
