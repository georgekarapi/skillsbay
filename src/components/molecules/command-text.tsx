type CommandTextProps = {
  text: string
}

/** Visual treatment only: copied commands always remain the literal `skillsbay` CLI name. */
export function CommandText({ text }: CommandTextProps) {
  return <>{text.split(/(skillsbay)/g).map((part, index) => part === "skillsbay" ? <span aria-label="skillsbay" key={index}>skills<span className="font-black text-orange-500 [text-shadow:0_0_12px_rgb(249_115_22_/_0.3)] dark:text-orange-400">bay</span></span> : part)}</>
}
