export const usage = [
  'usage: sand project [list] [--all]',
  '       sand project add <path>',
  '       sand project remove <name|path|id>            delete the project on every PC (folders stay)',
  '       sand project remove <name|path|id> --on <pc>  forget the copy on that PC (the folder stays)',
  '       sand project rename <name> <new name>',
  '       sand project hide <name>',
  '       sand project show <name>',
  '       sand project root [path] [--on <pc>]',
  '       sand project copy <name> --to <pc> [--from <pc>] [--path <folder>] [--setup]',
  '       sand project sync <name> --from <pc> --to <pc>',
  '       sand project status <name>',
  '       sand project resolve <name> --on <pc> (--ours | --theirs) [file…]',
].join('\n')
