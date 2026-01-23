"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  href?: string;
  label?: string;
};

export default function BackButton({ href, label = "Volver" }: Props) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50"
      >
        <ArrowLeft size={14} />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50"
    >
      <ArrowLeft size={14} />
      {label}
    </button>
  );
}
