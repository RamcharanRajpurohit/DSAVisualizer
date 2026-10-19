import { visualizerMetadata } from "@/config/metadata";
import { BTreeVisualizer } from "@/features/btree/BTreeVisualizer";

export const metadata = visualizerMetadata("btree");

export default function Page() {
  return <BTreeVisualizer />;
}
