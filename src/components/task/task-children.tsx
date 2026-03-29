'use client';

import { useChildTasks } from '@/lib/hooks/use-tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskRow } from './task-row';

interface TaskChildrenProps {
  parentId: string;
  projectId: string;
  editingCell: { taskId: string; field: string } | null;
  onEditCell: (cell: { taskId: string; field: string } | null) => void;
  expandedTasks: Set<string>;
  onExpand: (taskId: string) => void;
  onSelectTask?: (taskId: string) => void;
  showProject?: boolean;
  projectName?: string;
}

export function TaskChildren({
  parentId,
  projectId,
  editingCell,
  onEditCell,
  expandedTasks,
  onExpand,
  onSelectTask,
  showProject,
  projectName,
}: TaskChildrenProps) {
  const { data: children, isLoading } = useChildTasks(parentId, true);

  if (isLoading) {
    return (
      <>
        {[1, 2].map(i => (
          <tr key={`skeleton-${parentId}-${i}`} className="border-b border-slate-50">
            <td className="px-3 py-2.5" />
            <td className="px-3 py-2.5" />
            <td className="py-2.5 pr-3">
              <div className="flex items-center gap-2 pl-12">
                <Skeleton width={200} height={14} />
              </div>
            </td>
            {showProject && <td className="px-3 py-2.5" />}
            <td className="px-3 py-2.5"><Skeleton width={72} height={20} shape="rectangle" /></td>
            <td className="px-3 py-2.5"><Skeleton shape="circle" width={24} height={24} /></td>
            <td className="px-3 py-2.5"><Skeleton width={56} height={14} /></td>
            <td className="px-3 py-2.5"><Skeleton width={56} height={20} shape="rectangle" /></td>
            <td className="px-3 py-2.5" />
          </tr>
        ))}
      </>
    );
  }

  if (!children || children.length === 0) return null;

  return (
    <>
      {children.map((child, index) => (
        <TaskRow
          key={child.id}
          task={child}
          onExpand={onExpand}
          isExpanded={expandedTasks.has(child.id)}
          editingCell={editingCell}
          onEditCell={onEditCell}
          expandedTasks={expandedTasks}
          projectId={projectId}
          isLastChild={index === children.length - 1}
          onSelectTask={onSelectTask}
          showProject={showProject}
          projectName={projectName}
        />
      ))}
    </>
  );
}
