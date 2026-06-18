package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type FileNode struct {
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Type     string     `json:"type"`
	Children []FileNode `json:"children,omitempty"`
}

type Document struct {
	Path    string `json:"path"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

type SaveResult struct {
	Path    string `json:"path"`
	SavedAt string `json:"savedAt"`
}

type Attachment struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type WorkspaceInfo struct {
	RootPath string     `json:"rootPath"`
	Name     string     `json:"name"`
	Tree     []FileNode `json:"tree"`
}

type WorkspaceService struct {
	root string
}

var ErrWorkspaceNotSelected = errors.New("请先打开一个笔记文件夹")

func NewWorkspaceService(root string) (*WorkspaceService, error) {
	if strings.TrimSpace(root) == "" {
		return nil, errors.New("请选择一个笔记文件夹")
	}
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("无法解析文件夹路径: %w", err)
	}
	info, err := os.Stat(absRoot)
	if err != nil {
		return nil, fmt.Errorf("无法打开文件夹: %w", err)
	}
	if !info.IsDir() {
		return nil, errors.New("请选择文件夹，而不是文件")
	}
	return &WorkspaceService{root: filepath.Clean(absRoot)}, nil
}

func (s *WorkspaceService) RootPath() string {
	return s.root
}

func (s *WorkspaceService) WorkspaceInfo() (WorkspaceInfo, error) {
	tree, err := s.ListWorkspace()
	if err != nil {
		return WorkspaceInfo{}, err
	}
	return WorkspaceInfo{
		RootPath: s.root,
		Name:     filepath.Base(s.root),
		Tree:     tree,
	}, nil
}

func (s *WorkspaceService) ListWorkspace() ([]FileNode, error) {
	nodes, err := s.scanDir("")
	if err != nil {
		return nil, err
	}
	return nodes, nil
}

func (s *WorkspaceService) ReadMarkdown(relativePath string) (Document, error) {
	fullPath, cleanRelative, err := s.resolvePath(relativePath, false)
	if err != nil {
		return Document{}, err
	}
	if !isMarkdown(cleanRelative) {
		return Document{}, errors.New("只能打开 Markdown 文件")
	}
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return Document{}, fmt.Errorf("读取笔记失败: %w", err)
	}
	return Document{
		Path:    cleanRelative,
		Name:    path.Base(cleanRelative),
		Content: string(content),
	}, nil
}

func (s *WorkspaceService) SaveMarkdown(relativePath string, content string) (SaveResult, error) {
	fullPath, cleanRelative, err := s.resolvePath(relativePath, false)
	if err != nil {
		return SaveResult{}, err
	}
	if !isMarkdown(cleanRelative) {
		return SaveResult{}, errors.New("只能保存 Markdown 文件")
	}
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return SaveResult{}, fmt.Errorf("创建目录失败: %w", err)
	}
	if err := os.WriteFile(fullPath, []byte(content), 0o644); err != nil {
		return SaveResult{}, fmt.Errorf("保存笔记失败: %w", err)
	}
	return SaveResult{
		Path:    cleanRelative,
		SavedAt: time.Now().Format(time.RFC3339),
	}, nil
}

func (s *WorkspaceService) CreateMarkdown(parentRelativePath string, name string) (FileNode, error) {
	parentPath, cleanParent, err := s.resolvePath(parentRelativePath, true)
	if err != nil {
		return FileNode{}, err
	}
	info, err := os.Stat(parentPath)
	if err != nil {
		return FileNode{}, fmt.Errorf("父文件夹不存在: %w", err)
	}
	if !info.IsDir() {
		return FileNode{}, errors.New("只能在文件夹中创建笔记")
	}

	fileName, err := normalizeMarkdownName(name)
	if err != nil {
		return FileNode{}, err
	}
	relative := joinRelative(cleanParent, fileName)
	fullPath := filepath.Join(parentPath, fileName)
	if _, err := os.Stat(fullPath); err == nil {
		return FileNode{}, errors.New("同名笔记已存在")
	} else if !os.IsNotExist(err) {
		return FileNode{}, fmt.Errorf("检查笔记失败: %w", err)
	}
	if err := os.WriteFile(fullPath, []byte(""), 0o644); err != nil {
		return FileNode{}, fmt.Errorf("创建笔记失败: %w", err)
	}
	return FileNode{Name: fileName, Path: relative, Type: "file"}, nil
}

func (s *WorkspaceService) CreateFolder(parentRelativePath string, name string) (FileNode, error) {
	parentPath, cleanParent, err := s.resolvePath(parentRelativePath, true)
	if err != nil {
		return FileNode{}, err
	}
	info, err := os.Stat(parentPath)
	if err != nil {
		return FileNode{}, fmt.Errorf("父文件夹不存在: %w", err)
	}
	if !info.IsDir() {
		return FileNode{}, errors.New("只能在文件夹中创建子目录")
	}

	folderName, err := normalizeFolderName(name)
	if err != nil {
		return FileNode{}, err
	}
	relative := joinRelative(cleanParent, folderName)
	fullPath := filepath.Join(parentPath, folderName)
	if _, err := os.Stat(fullPath); err == nil {
		return FileNode{}, errors.New("同名文件夹已存在")
	} else if !os.IsNotExist(err) {
		return FileNode{}, fmt.Errorf("检查文件夹失败: %w", err)
	}
	if err := os.Mkdir(fullPath, 0o755); err != nil {
		return FileNode{}, fmt.Errorf("创建文件夹失败: %w", err)
	}
	return FileNode{Name: folderName, Path: relative, Type: "folder"}, nil
}

func (s *WorkspaceService) RenamePath(relativePath string, newName string) (FileNode, error) {
	oldPath, cleanRelative, err := s.resolvePath(relativePath, false)
	if err != nil {
		return FileNode{}, err
	}
	info, err := os.Stat(oldPath)
	if err != nil {
		return FileNode{}, fmt.Errorf("要重命名的项目不存在: %w", err)
	}

	name := strings.TrimSpace(newName)
	if name == "" || strings.ContainsAny(name, `/\`) {
		return FileNode{}, errors.New("名称不能包含路径分隔符")
	}
	if !info.IsDir() {
		name, err = normalizeMarkdownName(name)
		if err != nil {
			return FileNode{}, err
		}
	}

	parent := path.Dir(cleanRelative)
	if parent == "." {
		parent = ""
	}
	newRelative := joinRelative(parent, name)
	newPath, _, err := s.resolvePath(newRelative, false)
	if err != nil {
		return FileNode{}, err
	}
	if _, err := os.Stat(newPath); err == nil {
		return FileNode{}, errors.New("目标名称已存在")
	} else if !os.IsNotExist(err) {
		return FileNode{}, fmt.Errorf("检查目标名称失败: %w", err)
	}
	if err := os.Rename(oldPath, newPath); err != nil {
		return FileNode{}, fmt.Errorf("重命名失败: %w", err)
	}
	nodeType := "file"
	if info.IsDir() {
		nodeType = "folder"
	}
	return FileNode{Name: name, Path: newRelative, Type: nodeType}, nil
}

func (s *WorkspaceService) DeletePath(relativePath string) error {
	fullPath, _, err := s.resolvePath(relativePath, false)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(fullPath); err != nil {
		return fmt.Errorf("删除失败: %w", err)
	}
	return nil
}

func (s *WorkspaceService) SaveAttachment(directoryRelativePath string, originalName string, mimeType string, dataBase64 string) (Attachment, error) {
	directoryPath, cleanDirectory, err := s.resolvePath(directoryRelativePath, true)
	if err != nil {
		return Attachment{}, err
	}
	fileName, err := normalizeAttachmentName(originalName, mimeType)
	if err != nil {
		return Attachment{}, err
	}
	content, err := decodeBase64Payload(dataBase64)
	if err != nil {
		return Attachment{}, err
	}
	if err := os.MkdirAll(directoryPath, 0o755); err != nil {
		return Attachment{}, fmt.Errorf("创建附件目录失败: %w", err)
	}

	finalName, fullPath, err := nextAvailableAttachmentPath(directoryPath, fileName)
	if err != nil {
		return Attachment{}, err
	}
	if err := os.WriteFile(fullPath, content, 0o644); err != nil {
		return Attachment{}, fmt.Errorf("保存附件失败: %w", err)
	}

	return Attachment{
		Name: finalName,
		Path: joinRelative(cleanDirectory, finalName),
	}, nil
}

func (s *WorkspaceService) ResolveImageSource(documentRelativePath string, imageSource string) (string, error) {
	imagePath, _, err := s.resolveLinkedPath(documentRelativePath, imageSource)
	if err != nil {
		return "", err
	}
	content, err := os.ReadFile(imagePath)
	if err != nil {
		return "", fmt.Errorf("读取图片失败: %w", err)
	}
	contentType := imageContentType(imagePath, content)
	if !strings.HasPrefix(contentType, "image/") {
		return "", errors.New("只能读取图片文件")
	}
	return fmt.Sprintf(
		"data:%s;base64,%s",
		contentType,
		base64.StdEncoding.EncodeToString(content),
	), nil
}

func (s *WorkspaceService) RelativeDirectoryPath(directoryPath string) (string, error) {
	trimmed := strings.TrimSpace(directoryPath)
	if trimmed == "" {
		return "", errors.New("请选择附件存储目录")
	}
	absolute, err := filepath.Abs(trimmed)
	if err != nil {
		return "", fmt.Errorf("无法解析附件目录: %w", err)
	}
	info, err := os.Stat(absolute)
	if err != nil {
		return "", fmt.Errorf("附件目录不存在: %w", err)
	}
	if !info.IsDir() {
		return "", errors.New("附件存储位置必须是文件夹")
	}

	relative, err := filepath.Rel(s.root, absolute)
	if err != nil {
		return "", fmt.Errorf("无法校验附件目录: %w", err)
	}
	if relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", errors.New("附件目录必须位于当前工作区内")
	}
	if relative == "." {
		return ".", nil
	}
	return filepath.ToSlash(relative), nil
}

func (s *WorkspaceService) scanDir(relative string) ([]FileNode, error) {
	fullPath := s.root
	if relative != "" {
		resolved, _, err := s.resolvePath(relative, true)
		if err != nil {
			return nil, err
		}
		fullPath = resolved
	}
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, fmt.Errorf("读取目录失败: %w", err)
	}

	nodes := make([]FileNode, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		entryRelative := joinRelative(relative, name)
		if entry.IsDir() {
			children, err := s.scanDir(entryRelative)
			if err != nil {
				return nil, err
			}
			nodes = append(nodes, FileNode{
				Name:     name,
				Path:     entryRelative,
				Type:     "folder",
				Children: children,
			})
			continue
		}
		if isMarkdown(name) {
			nodes = append(nodes, FileNode{Name: name, Path: entryRelative, Type: "file"})
		}
	}

	sort.SliceStable(nodes, func(i, j int) bool {
		if nodes[i].Type != nodes[j].Type {
			return nodes[i].Type == "folder"
		}
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})
	return nodes, nil
}

func (s *WorkspaceService) resolvePath(relativePath string, allowRoot bool) (string, string, error) {
	cleanRelative, err := cleanRelativePath(relativePath, allowRoot)
	if err != nil {
		return "", "", err
	}
	fullPath := s.root
	if cleanRelative != "" {
		fullPath = filepath.Join(s.root, filepath.FromSlash(cleanRelative))
	}
	relativeToRoot, err := filepath.Rel(s.root, fullPath)
	if err != nil {
		return "", "", fmt.Errorf("无法校验路径: %w", err)
	}
	if relativeToRoot == ".." || strings.HasPrefix(relativeToRoot, ".."+string(filepath.Separator)) {
		return "", "", errors.New("路径超出工作区")
	}
	return fullPath, cleanRelative, nil
}

func (s *WorkspaceService) resolveLinkedPath(documentRelativePath string, linkTarget string) (string, string, error) {
	cleanDocument, err := cleanRelativePath(documentRelativePath, false)
	if err != nil {
		return "", "", err
	}
	if !isMarkdown(cleanDocument) {
		return "", "", errors.New("只能从 Markdown 文件解析图片路径")
	}

	decodedTarget, err := cleanLinkTarget(linkTarget)
	if err != nil {
		return "", "", err
	}
	documentDirectory := path.Dir(cleanDocument)
	if documentDirectory == "." {
		documentDirectory = ""
	}
	candidate := path.Clean(path.Join(documentDirectory, decodedTarget))
	if candidate == "." || candidate == ".." || strings.HasPrefix(candidate, "../") {
		return "", "", errors.New("图片路径超出工作区")
	}
	return s.resolvePath(candidate, false)
}

func cleanRelativePath(value string, allowRoot bool) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		if allowRoot {
			return "", nil
		}
		return "", errors.New("路径不能为空")
	}
	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	if filepath.IsAbs(trimmed) || path.IsAbs(normalized) || filepath.VolumeName(trimmed) != "" {
		return "", errors.New("路径必须位于工作区内")
	}
	clean := path.Clean(normalized)
	if clean == "." {
		if allowRoot {
			return "", nil
		}
		return "", errors.New("路径不能为空")
	}
	for _, segment := range strings.Split(clean, "/") {
		if segment == ".." {
			return "", errors.New("路径不能包含 ..")
		}
	}
	return clean, nil
}

func cleanLinkTarget(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", errors.New("图片路径不能为空")
	}
	if strings.HasPrefix(trimmed, "//") {
		return "", errors.New("图片路径必须位于工作区内")
	}
	if parsed, err := url.Parse(trimmed); err == nil && parsed.Scheme != "" {
		return "", errors.New("图片路径必须位于工作区内")
	}

	withoutSuffix := trimmed
	if index := strings.IndexAny(withoutSuffix, "?#"); index >= 0 {
		withoutSuffix = withoutSuffix[:index]
	}
	decoded, err := url.PathUnescape(withoutSuffix)
	if err != nil {
		return "", fmt.Errorf("图片路径编码无效: %w", err)
	}
	normalized := strings.ReplaceAll(decoded, "\\", "/")
	if filepath.IsAbs(decoded) || filepath.VolumeName(decoded) != "" || path.IsAbs(normalized) {
		return "", errors.New("图片路径必须位于工作区内")
	}
	if normalized == "." || normalized == ".." || strings.TrimSpace(normalized) == "" {
		return "", errors.New("图片路径不能为空")
	}
	return normalized, nil
}

func normalizeMarkdownName(name string) (string, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" || strings.ContainsAny(trimmed, `/\`) {
		return "", errors.New("笔记名称不能为空且不能包含路径分隔符")
	}
	if path.Ext(trimmed) == "" {
		trimmed += ".md"
	}
	if !isMarkdown(trimmed) {
		return "", errors.New("笔记名称必须以 .md 结尾")
	}
	return trimmed, nil
}

func normalizeFolderName(name string) (string, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" || trimmed == "." || trimmed == ".." || strings.ContainsAny(trimmed, `/\`) {
		return "", errors.New("文件夹名称不能为空且不能包含路径分隔符")
	}
	return trimmed, nil
}

func normalizeAttachmentName(name string, mimeType string) (string, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		trimmed = "pasted-file" + extensionForMimeType(mimeType)
	}
	if trimmed == "." || trimmed == ".." || strings.ContainsAny(trimmed, `/\`) {
		return "", errors.New("附件名称不能为空且不能包含路径分隔符")
	}

	sanitized := strings.Map(func(value rune) rune {
		if value < 32 || strings.ContainsRune(`<>:"|?*`, value) {
			return '_'
		}
		return value
	}, trimmed)
	sanitized = strings.TrimSpace(sanitized)
	if sanitized == "" || sanitized == "." || sanitized == ".." {
		return "", errors.New("附件名称无效")
	}
	if path.Ext(sanitized) == "" {
		sanitized += extensionForMimeType(mimeType)
	}
	return sanitized, nil
}

func decodeBase64Payload(value string) ([]byte, error) {
	trimmed := strings.TrimSpace(value)
	if comma := strings.Index(trimmed, ","); strings.HasPrefix(trimmed, "data:") && comma >= 0 {
		trimmed = trimmed[comma+1:]
	}
	content, err := base64.StdEncoding.DecodeString(trimmed)
	if err != nil {
		return nil, fmt.Errorf("附件内容不是有效的 base64: %w", err)
	}
	return content, nil
}

func nextAvailableAttachmentPath(directoryPath string, fileName string) (string, string, error) {
	extension := path.Ext(fileName)
	baseName := strings.TrimSuffix(fileName, extension)
	for index := 0; index < 10_000; index++ {
		candidate := fileName
		if index > 0 {
			candidate = fmt.Sprintf("%s-%d%s", baseName, index, extension)
		}
		fullPath := filepath.Join(directoryPath, candidate)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			return candidate, fullPath, nil
		} else if err != nil {
			return "", "", fmt.Errorf("检查附件名称失败: %w", err)
		}
	}
	return "", "", errors.New("无法生成可用的附件名称")
}

func extensionForMimeType(mimeType string) string {
	switch strings.ToLower(strings.TrimSpace(mimeType)) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/svg+xml":
		return ".svg"
	case "application/pdf":
		return ".pdf"
	default:
		return ".bin"
	}
}

func imageContentType(filePath string, content []byte) string {
	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(filePath)))
	if semicolon := strings.Index(contentType, ";"); semicolon >= 0 {
		contentType = contentType[:semicolon]
	}
	if strings.HasPrefix(contentType, "image/") {
		return contentType
	}
	detected := http.DetectContentType(content)
	if semicolon := strings.Index(detected, ";"); semicolon >= 0 {
		detected = detected[:semicolon]
	}
	return detected
}

func isMarkdown(value string) bool {
	return strings.EqualFold(path.Ext(value), ".md")
}

func joinRelative(parent string, name string) string {
	if parent == "" {
		return name
	}
	return path.Join(parent, name)
}
