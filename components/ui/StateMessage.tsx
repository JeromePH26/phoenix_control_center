import { ReactNode } from "react";

export default function StateMessage({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 px-6 py-12 text-center">
      {icon}
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-neutral-400">{description}</p>
      )}
    </div>
  );
}
