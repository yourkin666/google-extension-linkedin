#!/bin/bash
#
# 构建 Chrome 插件 ZIP 包脚本
# 功能：
# 1. 自动递增 manifest.json 中的版本号（patch 版本）
# 2. 创建 ZIP 压缩包，排除不需要的文件
#

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取项目根目录（脚本所在目录）
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$ROOT_DIR/packages/extension"
MANIFEST_PATH="$EXTENSION_DIR/manifest.json"

# 检查 manifest.json 是否存在
if [ ! -f "$MANIFEST_PATH" ]; then
    echo -e "${RED}❌ 错误: manifest.json 文件不存在${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 开始构建 Chrome 插件 ZIP 包...${NC}\n"

# 检查是否安装了 jq（用于处理 JSON）
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  未检测到 jq，尝试使用 sed 处理 JSON...${NC}"
    USE_JQ=false
else
    USE_JQ=true
fi

# 读取当前版本号
if [ "$USE_JQ" = true ]; then
    OLD_VERSION=$(jq -r '.version' "$MANIFEST_PATH")
else
    # 使用 grep 和 sed 提取版本号
    OLD_VERSION=$(grep -o '"version": "[^"]*"' "$MANIFEST_PATH" | sed 's/"version": "\(.*\)"/\1/')
fi

if [ -z "$OLD_VERSION" ]; then
    echo -e "${RED}❌ 无法读取版本号${NC}"
    exit 1
fi

# 递增版本号（patch 版本）
IFS='.' read -ra VERSION_PARTS <<< "$OLD_VERSION"
if [ ${#VERSION_PARTS[@]} -ne 3 ]; then
    echo -e "${RED}❌ 无效的版本号格式: $OLD_VERSION，应为 x.y.z 格式${NC}"
    exit 1
fi

MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

# 更新 manifest.json 中的版本号
if [ "$USE_JQ" = true ]; then
    # 使用 jq 更新版本号
    jq ".version = \"$NEW_VERSION\"" "$MANIFEST_PATH" > "$MANIFEST_PATH.tmp" && mv "$MANIFEST_PATH.tmp" "$MANIFEST_PATH"
else
    # 使用 sed 更新版本号（macOS 和 Linux 兼容）
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_PATH"
    else
        sed -i "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_PATH"
    fi
fi

echo -e "${GREEN}📦 版本号已更新: $OLD_VERSION -> $NEW_VERSION${NC}"

# ZIP 文件名
ZIP_NAME="colink-extension-v${NEW_VERSION}.zip"
ZIP_PATH="$ROOT_DIR/$ZIP_NAME"

# 如果已存在同名文件，先删除
if [ -f "$ZIP_PATH" ]; then
    rm -f "$ZIP_PATH"
fi

echo -e "\n${BLUE}📦 正在创建 ZIP 压缩包...${NC}"

# 进入扩展目录
cd "$EXTENSION_DIR"

# 使用 zip 命令创建压缩包，排除不需要的文件
# -r: 递归
# -q: 静默模式
# -x: 排除文件模式

zip -r -q "$ZIP_PATH" . \
    -x "node_modules/*" \
    -x ".git/*" \
    -x "scripts/*" \
    -x "dist/*" \
    -x ".DS_Store" \
    -x ".env*" \
    -x "README.md" \
    -x "package.json" \
    -x "package-lock.json" \
    -x "*.log" \
    -x "*.zip" \
    -x "*.test.html" \
    2>/dev/null

# 检查 ZIP 文件是否创建成功
if [ ! -f "$ZIP_PATH" ]; then
    echo -e "${RED}❌ ZIP 文件创建失败${NC}"
    exit 1
fi

# 获取文件大小
ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)

echo -e "${GREEN}✅ ZIP 文件已创建: $ZIP_NAME ($ZIP_SIZE)${NC}"
echo -e "\n${GREEN}🎉 构建完成！${NC}"
echo -e "${BLUE}📁 ZIP 文件位置: ${ZIP_PATH}${NC}"
echo -e "\n${YELLOW}💡 提示: 可以直接将此 ZIP 文件上传到 Chrome 网上应用店${NC}"

