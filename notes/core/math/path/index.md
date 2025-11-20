## path

Path stores vector path commands and provides construction and manipulation utilities.

- PathCommand -> union of MoveTo, LineTo, Cubic (C), Quadratic (Q), and Close (Z) commands

- constructor(commands?) -> create a path with an optional list of PathCommand

- commands -> readonly accessor returning all PathCommands

- moveTo(x, y) -> push MoveTo command and set current/start point

- lineTo(x, y) -> push LineTo command and update current point

- curveTo(cp1x, cp1y, cp2x, cp2y, x, y) -> push Cubic Bezier command

- quadraticCurveTo(cpx, cpy, x, y) -> push Quadratic Bezier command

- close() -> push Close command and return to start point

- getBounds() -> compute axis-aligned bounding box including control points

- clone() -> shallow copy of commands

- clear() -> remove all commands and reset points

- isEmpty() -> true when there are no commands

- toJSON() -> serialize commands to JSON

- fromJSON(commands) -> construct path from serialized commands

