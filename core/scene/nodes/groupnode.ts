import { SceneNode } from "../node"
import { Transform } from "../transform"

/**
 * GroupNode is a container for organizing multiple nodes
 * It provides no additional functionality beyond SceneNode's hierarchy management
 */
export class GroupNode extends SceneNode {
    constructor(transform?: Transform) {
        super(transform)
    }
}
