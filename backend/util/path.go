package util

import (
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

// PathExists path exists or not
func PathExists(path string) (bool, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(absPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

type TreeNode struct {
	Id       string      `json:"id"`
	Name     string      `json:"name"`
	Label    string      `json:"label"`
	Path     string      `json:"path"`
	Children []*TreeNode `json:"children,omitempty"`
	Type     string      `json:"type"`
}

// BuildDirTreeData build directory tree structure data based on the root path
func BuildDirTreeData(root string) (*TreeNode, error) {
	node := &TreeNode{
		Id:    uuid.NewString(),
		Name:  filepath.Base(root),
		Label: filepath.Base(root),
		Path:  root,
		Type:  "folder",
	}
	entries, err := os.ReadDir(root) // 读取目录下的所有条目
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		path := filepath.Join(root, entry.Name())
		if entry.IsDir() {
			child, err := BuildDirTreeData(path) // 递归构建子目录的树结构
			if err != nil {
				return nil, err
			}
			child.Type = "folder"
			node.Children = append(node.Children, child) // 将子目录添加到当前节点的Children列表中
		} else {
			child := &TreeNode{
				Id:    uuid.NewString(),
				Name:  entry.Name(),
				Label: entry.Name(),
				Path:  path,
				Type:  "file",
			}
			node.Children = append(node.Children, child) // 添加文件节点
		}
	}
	return node, nil
}
