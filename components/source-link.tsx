export function SourceLink({ href, handle }: { href: string; handle: string }) {
  return (
    <a
      href={href}
      className="tap underline decoration-rule underline-offset-4"
      rel="noopener noreferrer"
      aria-label={`Source for @${handle} on X`}
    >
      Source
    </a>
  );
}
