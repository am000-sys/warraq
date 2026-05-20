// src/components/job-auto-refresh.tsx
// يُحدّث صفحة الوظيفة تلقائياً أثناء المعالجة عبر polling
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function JobAutoRefresh({ jobId }: { jobId: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const { job } = await res.json();
          if (job.status !== "PROCESSING" && job.status !== "PENDING") {
            router.refresh();
            clearInterval(t);
          }
        }
      } catch {
        /* تجاهل أخطاء الشبكة المؤقّتة */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [jobId, router]);
  return null;
}
