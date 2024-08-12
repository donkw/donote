package app

import (
	"context"
	"donote/backend/util"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type common struct {
	ctx context.Context
}

func NewCommonApp() *common {
	return &common{}
}

func (app *common) Startup(ctx context.Context) {
	app.ctx = ctx
}

// GetUserConfigData 读取用户配置文件
func (app *common) GetUserConfigData(fileName string) *util.Response {
	resp := util.NewResponse()
	data, err := os.ReadFile(fileName)
	if err != nil && !os.IsNotExist(err) {
		return resp.FailMsg("读取配置文件失败：%s", err)
	}
	if len(data) == 0 {
		return resp.SuccessData("{}")
	}
	return resp.SuccessData(string(data))
}

// OpenDirectoryDialog 打开系统选择目录对话框
func (app *common) OpenDirectoryDialog() *util.Response {
	resp := util.NewResponse()
	dir, err := wailsRuntime.OpenDirectoryDialog(app.ctx, wailsRuntime.OpenDialogOptions{Title: "选择笔记文件目录"})
	if err != nil {
		return resp.FailMsg("打开系统选择目录对话框失败：%s", err)
	}
	return resp.SuccessData(dir)
}

// SaveUserConfigData 保存用户配置
func (app *common) SaveUserConfigData(fileName, data string) *util.Response {
	resp := util.NewResponse()
	var raw json.RawMessage
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return resp.FailMsg("json格式不正确：%s", err)
	}
	beautyJson, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return resp.FailMsg("json格式化错误：%s", err)
	}
	if err = os.WriteFile(fileName, beautyJson, 0644); err != nil {
		return resp.FailMsg("写入配置文件失败：%s", err)
	}
	return resp.Success()
}

// OpenDir 打开目录
func (app *common) OpenDir(dir string) *util.Response {
	resp := util.NewResponse()
	if err := exec.Command("explorer", dir).Start(); err != nil {
		return resp.FailMsg("打开目录失败：%s", err)
	}
	return resp.Success()
}

// WalkDir 遍历目录，获取文件夹和文件
func (app *common) GetUserNoteDirAsTreeData(filePath string) *util.Response {
	resp := util.NewResponse()
	root, err := filepath.Abs(filePath)
	if err != nil {
		return resp.FailMsg(err.Error())
	}
	treeData, err := util.BuildDirTreeData(root)
	if err != nil {
		return resp.FailMsg(err.Error())
	}
	return resp.SuccessData(treeData)
}

// CreateOrRenameFolder 创建/重命名文件夹
func (app *common) CreateOrRenameFolder(oldName, newName, parentDir string) *util.Response {
	resp := util.NewResponse()
	absParentDir, err := filepath.Abs(parentDir)
	if err != nil {
		return resp.FailMsg("目录路径解析失败：%s", err)
	}
	oldDirPath := filepath.Join(absParentDir, oldName)
	newDirPath := filepath.Join(absParentDir, newName)
	// 存在同名目录
	if _, err := os.Stat(newDirPath); !os.IsNotExist(err) {
		return resp.FailMsg("存在同名目录")
	}
	// 旧名为空，为新建文件，否则为重命名文件
	if oldName == "" {
		err := os.Mkdir(newDirPath, 0755)
		if err != nil {
			return resp.FailMsg("创建目录失败：%s", err)
		}
	} else {
		if err := os.Rename(oldDirPath, newDirPath); err != nil {
			return resp.FailMsg("重命名目录失败：%s", err)
		}
	}
	return resp.Success()
}

// CreateOrRenameFile 创建/重命名文件
func (app *common) CreateOrRenameFile(oldName, newName, parentDir string) *util.Response {
	resp := util.NewResponse()
	absParentDir, err := filepath.Abs(parentDir)
	if err != nil {
		return resp.FailMsg("文件路径解析失败：%s", err)
	}
	oldFilePath := filepath.Join(absParentDir, oldName)
	newFilePath := filepath.Join(absParentDir, newName)
	// 存在同名文件
	if _, err := os.Stat(newFilePath); !os.IsNotExist(err) {
		return resp.FailMsg("存在同名文件")
	}
	// 旧名为空，为新建文件，否则为重命名文件
	if oldName == "" {
		file, err := os.Create(newFilePath)
		if err != nil {
			return resp.FailMsg("创建文件失败：%s", err)
		}
		defer file.Close()
	} else {
		if err := os.Rename(oldFilePath, newFilePath); err != nil {
			return resp.FailMsg("重命名文件失败：%s", err)
		}
	}
	return resp.Success()
}
