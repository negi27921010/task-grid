import type { Task } from '../types';

export interface TaskTreeNode extends Task {
  children: TaskTreeNode[];
}

export function buildTaskTree(tasks: Task[]): TaskTreeNode[] {
  const taskMap = new Map<string, TaskTreeNode>();
  const roots: TaskTreeNode[] = [];

  // Create nodes
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  // Build tree
  tasks.forEach(task => {
    const node = taskMap.get(task.id)!;
    if (task.parent_id && taskMap.has(task.parent_id)) {
      taskMap.get(task.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by position
  const sortChildren = (nodes: TaskTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

export function flattenTree(nodes: TaskTreeNode[]): Task[] {
  const result: Task[] = [];
  const traverse = (nodeList: TaskTreeNode[]) => {
    nodeList.forEach(node => {
      const { children, ...task } = node;
      result.push({ ...task, children_count: children.length });
      traverse(children);
    });
  };
  traverse(nodes);
  return result;
}

export function getDescendantIds(taskId: string, allTasks: Task[]): string[] {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return [];
  return allTasks
    .filter(t => t.path.startsWith(task.path + '/') && t.id !== taskId)
    .map(t => t.id);
}

export function computeSubtreeCount(taskId: string, allTasks: Task[]): number {
  return allTasks.filter(t => t.parent_id === taskId).length;
}
