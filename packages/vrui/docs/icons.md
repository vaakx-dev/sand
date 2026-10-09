# Icons

VRUI includes a small Lucide wrapper. `icon(node, size = 12, strokeWidth = 2)`
returns a `span.vrui-icon` containing the SVG. Import each icon node explicitly
from `lucide` so bundlers can exclude unused icons. VRUI re-exports Lucide's
`IconNode` type for APIs that accept icon nodes.

```ts
import { ChevronDown, Save, Settings } from "lucide";
import { button, icon } from "@vaakx-dev/vrui";

const chevron = icon(ChevronDown, 16, 1.75);
const settings = icon(Settings);
const save = icon(Save);

const controls = button({ class: "icon-button" }, chevron, settings, save);
```
