/*
 * AVLEngine extends BSTEngine.
 *
 * Inheritance in action: search, the walk-down animation, node/edge drawing, the morph engine,
 * insert/delete skeletons and traversals are all INHERITED — nothing here duplicates them. This
 * subclass only states what makes an AVL tree different from a plain BST:
 *   • insertSilent  — overridden: inserts while rotating, so silent builds stay balanced
 *   • afterInsert   — overridden: retraces the path, rotates any unbalanced node
 *   • afterDelete   — overridden: same rebalancing after a deletion
 *   • retrace / rebalanceAt / rotateAt — the AVL-only machinery (LL / RR / LR / RL cases)
 *   • demo()        — scripted rotation demos
 *
 * Rotations play out in phases (each one a step boundary in step mode):
 *   1. retrace upward, recomputing height and balance factor at every ancestor
 *   2. spot the unbalanced node z and name the case (LL / RR / LR / RL)
 *   3. mark z, the pivot y and the subtree T2 that has to change parents
 *   4. cut T2 loose and draw the path each node is about to travel
 *   5. swing y up and z down along those paths; T2 re-hangs under z
 *   6. update the heights of z and y
 */
import { avlInsertSilent, classify, collect, fmtBf, hOf, replaceChild, rotate, update } from "../model/tree";
import type { NodeFactory, Side, TreeNode } from "../model/types";
import { AVL_DEMOS, type DemoId } from "../constants";
import { LN, type CodeId, type RetraceLines } from "../pseudocode";
import type { Point } from "./anim";
import { BSTEngine } from "./BSTEngine";
import { ARROW } from "./theme";

const CASE_NAME = { LL: "Left-Left", RR: "Right-Right", LR: "Left-Right", RL: "Right-Left" } as const;

export class AVLEngine extends BSTEngine {
  // ───────────────────── overridden labels ─────────────────────

  protected override treeName() { return "AVL tree"; }
  protected override insertCodeId(): CodeId { return "avl-insert"; }
  protected override deleteCodeId(): CodeId { return "avl-delete"; }

  protected override shapeNote(): string {
    if (!this.root) return "The tree is now empty.";
    return `Height **${hOf(this.root)}**, every balance factor within −1…+1.`;
  }

  // ───────────────────── overridden Template-Method seams ─────────────────────

  /** Like the parent's plain insert, but rebalances so the height stays ≤ ~1.44·log₂(n). */
  protected override insertSilent(v: number, make: NodeFactory = this.make): void {
    this.root = avlInsertSilent(this.root, v, make);
  }

  /** The parent attached the new leaf; walk back up and rebalance. */
  protected override async afterInsert(path: TreeNode[], n: TreeNode): Promise<void> {
    await this.retrace(path, this.insertCodeId(), LN.retrace.insert);
    this.status(`✓ Inserted ${n.key}`, this.shapeNote(), "ok");
  }

  /** The parent unlinked the node; walk back up and rebalance. */
  protected override async afterDelete(chain: TreeNode[], key: number): Promise<void> {
    if (this.root) await this.retrace(chain, this.deleteCodeId(), LN.retrace.delete);
    this.status(`✓ Deleted ${key}`, this.shapeNote(), "ok");
  }

  // ───────────────────── demos ─────────────────────

  demo(id: DemoId): Promise<boolean> {
    const D = AVL_DEMOS[id];
    return this.scenario({ title: `Demo · ${D.title}`, intro: D.intro, base: D.base, steps: [{ op: D.op, values: [D.value] }] });
  }

  // ───────────────────── REBALANCING ─────────────────────

  /** chain = nodes from the root down to the lowest node whose subtree changed. */
  private async retrace(chain: TreeNode[], C: CodeId, L: RetraceLines): Promise<void> {
    if (!chain.length) return;
    this.code(C, L.loop);
    this.status("Retrace to the root",
      "Walk back up, recomputing each node's **height** and **balance** h(left) − h(right). A node outside −1…+1 gets rotated.");
    await this.beat(0.5);

    for (let i = chain.length - 1; i >= 0; i--) {
      const n = chain[i];
      const parent = i > 0 ? chain[i - 1] : null;
      const oldH = n.h;
      const hl = hOf(n.left), hr = hOf(n.right);
      update(n);
      const bad = Math.abs(n.bf) > 1;

      this.code(C, [L.loop, L.heights, L.height, L.bf]);
      this.vars({ n: n.key, "h(left)": hl, "h(right)": hr, height: n.h, "old height": oldH, bf: fmtBf(n.bf) });
      await this.nodeStyle(n, bad ? "danger" : "compare", 0.2);
      const lbl = this.nodeLabel(n, `h ${n.h} · bf ${fmtBf(n.bf)}`, bad ? "danger" : "info");
      this.status(`Check ${n.key}`,
        `height = 1 + max(${hl}, ${hr}) = **${n.h}**, balance = ${hl} − ${hr} = **${fmtBf(n.bf)}**` +
        (bad ? " — outside −1…+1, so this node is **unbalanced** and needs a rotation." : " — within −1…+1, fine."),
        bad ? "danger" : "info");
      await this.updateMeta(n);
      await this.beat(bad ? 0.8 : 0.45);
      this.dropLabel(lbl);

      let top = n;
      if (bad) {
        this.code(C, L.rebalance);
        top = await this.rebalanceAt(n, parent);
        this.subCode(null);
      } else void this.nodeStyle(n, "base");

      if (top.h === oldH) {
        this.code(C, L.stop);
        if (i > 0) {
          this.status(`Subtree height unchanged (${top.h})`,
            `${top.key}'s subtree is as tall as before, so nothing above can change — **stop** early.`, "ok");
          await this.beat(0.7);
        }
        break;
      }
    }
  }

  private async rebalanceAt(z: TreeNode, parent: TreeNode | null): Promise<TreeNode> {
    const RB = LN.rebalance;
    const { kase, leftHeavy, zigzag, y, x } = classify(z);
    const heavy = leftHeavy ? "left" : "right";
    const lean = y.bf === 0 ? "is even" : y.bf > 0 ? "leans left" : "leans right";
    const fix = zigzag
      ? `first a **${leftHeavy ? "left" : "right"} rotation at ${y.key}** to straighten the bend, then a **${leftHeavy ? "right" : "left"} rotation at ${z.key}**`
      : `a single **${leftHeavy ? "right" : "left"} rotation at ${z.key}**`;

    this.subCode("rebalance", [leftHeavy ? RB.leftHeavy : RB.rightHeavy, leftHeavy ? RB.lr : RB.rl]);
    this.vars({ z: z.key, "bf(z)": fmtBf(z.bf), y: y.key, "bf(y)": fmtBf(y.bf), case: kase });
    this.status(`${CASE_NAME[kase]} case at ${z.key}`,
      `${z.key} is ${heavy}-heavy (bf ${fmtBf(z.bf)}) and its ${heavy} child ${y.key} ${lean} (bf ${fmtBf(y.bf)})` +
      (zigzag ? " — the heavy path **zig-zags**." : " — the heavy path is a **straight line**.") + ` Fix: ${fix}.`, "danger");
    await Promise.all([this.nodeStyle(z, "danger"), this.nodeStyle(y, "moving"), x ? this.nodeStyle(x, "left") : null]);
    const lbl = this.nodeLabel(z, `${kase} case`, "danger");
    await this.flash(z);
    await this.beat(1.1);
    this.dropLabel(lbl);

    if (zigzag) {
      this.subCode("rebalance", leftHeavy ? RB.lrRotate : RB.rlRotate);
      await this.rotateAt(y, leftHeavy ? "left" : "right", z, `${kase} · step 1 of 2`);
      this.subCode("rebalance", leftHeavy ? RB.ll : RB.rr);
      this.status(`Now it is a straight ${leftHeavy ? "Left-Left" : "Right-Right"} line`,
        `One more rotation at ${z.key} finishes the job.`, "warn");
      await this.beat(0.7);
    } else {
      this.subCode("rebalance", leftHeavy ? RB.ll : RB.rr);
      await this.wait(0.3);
    }
    return this.rotateAt(z, leftHeavy ? "right" : "left", parent, zigzag ? `${kase} · step 2 of 2` : `${kase} case`);
  }

  private async rotateAt(z: TreeNode, dir: Side, parent: TreeNode | null, tag: string): Promise<TreeNode> {
    const R = dir === "right";
    const y = (R ? z.left : z.right)!;
    const t2 = R ? y.right : y.left;
    const Dir = R ? "Right" : "Left";
    const inner = R ? "right" : "left", outer = R ? "left" : "right";
    const RC: CodeId = R ? "rotateRight" : "rotateLeft";
    const RL = LN.rotate;
    const back = this.focusSub();

    // 1 — roles
    this.subCode(RC, [RL.pivot, RL.t2]);
    this.vars({ z: z.key, y: y.key, T2: t2?.key ?? "∅", dir: Dir.toLowerCase() });
    this.status(`${tag} · ${Dir} rotation at ${z.key}`,
      `Pivot **${y.key}** rises into ${z.key}'s place; **${z.key}** drops to its ${inner}.` +
      (t2 ? ` ${y.key}'s ${inner} subtree **T2 (${t2.key})** becomes ${z.key}'s ${outer} child.`
        : ` ${y.key} has no ${inner} subtree to hand over.`), "warn");
    await Promise.all([this.nodeStyle(z, "danger"), this.nodeStyle(y, "moving"), t2 ? this.subtreeStyle(t2, "merge") : null]);
    const labels = [this.nodeLabel(z, "z", "danger"), this.nodeLabel(y, "pivot y", "warn")];
    if (t2) labels.push(this.nodeLabel(t2, "T2", "merge"));
    await this.beat(1.0);

    // 2 — cut T2 loose
    if (t2) {
      this.subCode(RC, RL.t2);
      this.status(`${tag} · Detach T2`,
        `Cut the link ${y.key} → ${t2.key}. Every key in T2 lies between ${Math.min(y.key, z.key)} and ${Math.max(y.key, z.key)}, so it can hang under ${z.key} instead.`, "merge");
      await this.edgeStyle(y, t2, "cut", 0.3);
      await this.beat(0.7);
    }
    labels.forEach((l) => this.dropLabel(l));

    // 3 — commit the new links (shared pure primitive), heights of z then y
    const pz = this.pos(z), py = this.pos(y);
    rotate(z, dir);
    this.root = replaceChild(this.root, parent, z, y);
    this.rotations++;

    // 4 — show where each node is heading
    const L = this.layout();
    const tz = L.nodes.get(z.id), ty = L.nodes.get(y.id);
    const cx = (pz.x + py.x) / 2, cy = (pz.y + py.y) / 2;
    const bowFor = (a: Point, b: Point): Point => {
      const mx = (a.x + b.x) / 2 - cx, my = (a.y + b.y) / 2 - cy, d = Math.hypot(mx, my) || 1;
      const k = 0.45 * Math.hypot(b.x - a.x, b.y - a.y);
      return { x: (mx / d) * k, y: (my / d) * k };
    };
    const bz = tz ? bowFor(pz, tz) : { x: 0, y: 0 };
    const by = ty ? bowFor(py, ty) : { x: 0, y: 0 };
    this.subCode(RC, [RL.link, RL.hang]);
    this.status(`${tag} · Rotate`,
      `${y.key} swings up, ${z.key} swings down to the ${inner}` + (t2 ? `, and T2 re-hangs under ${z.key}` : "") +
      ". The keys' left-to-right order never changes.", "warn");
    const arrows = [
      tz ? this.pathArrow(pz, tz, bz, ARROW.z) : null,
      ty ? this.pathArrow(py, ty, by, ARROW.y) : null,
    ];
    await this.beat(0.7);

    // 5 — swing everything into place along the arcs
    const bow = new Map<string, Point>();
    collect(z).forEach((n) => bow.set(n.id, bz));
    collect(y).forEach((n) => { if (!bow.has(n.id)) bow.set(n.id, by); });
    await this.morph(1.0, bow);
    arrows.forEach((a) => this.dropLabel(a));

    // 6 — T2 re-attached, heights updated
    this.subCode(RC, RL.update);
    if (t2) await this.edgeStyle(z, t2, "fresh", 0.3);
    await Promise.all([this.updateMeta(z), this.updateMeta(y)]);
    await Promise.all([this.nodeStyle(z, "success"), this.nodeStyle(y, "success")]);
    this.vars({ z: z.key, "h(z)": z.h, "bf(z)": fmtBf(z.bf), y: y.key, "h(y)": y.h, "bf(y)": fmtBf(y.bf) });
    this.subCode(RC, RL.ret);
    this.status(`${tag} · Done`,
      `${y.key} now roots this subtree. ${z.key}: height ${z.h}, bf ${fmtBf(z.bf)} · ${y.key}: height ${y.h}, bf ${fmtBf(y.bf)}.`, "ok");
    await this.beat(0.8);
    await this.resetStyles(0.3);
    if (back) this.subCode(back.id, back.line);
    return y;
  }
}
