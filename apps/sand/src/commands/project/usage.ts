export const usage = [
  'usage: sand project [list] [--all]',
  '       sand project add <path>',
  '       sand project remove <name|path> [--on <pc>]',
  '       sand project rename <name> <new name>',
  '       sand project hide <name>',
  '       sand project show <name>',
  '       sand project root [path] [--on <pc>]',
  '       sand project copy <name> --to <pc> [--from <pc>] [--path <folder>] [--setup]',
  '       sand project sync <name> --from <pc> --to <pc>',
  '       sand project status <name>',
  '       sand project resolve <name> --on <pc> (--ours | --theirs) [file…]',
].join('\n')
