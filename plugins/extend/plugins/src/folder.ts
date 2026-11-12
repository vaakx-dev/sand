const folderName = (folder: string) => folder.split(/[\/]/).pop() ?? folder

export { folderName }
