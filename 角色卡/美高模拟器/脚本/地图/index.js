"use strict";
const lorebook_name = '美高模拟器';
const map_tag = '<Map>';
const map_regex = /<Map>([\s\S]+?)<\/Map>/s;

//----------------------------------------------------------------------------------------------------------------------
// 地图格式说明:
// [MOVEBLOCK:YES/NO] - 控制是否允许自由移动
// [主地点]子地点1@角色1,角色2|子地点2@角色3,角色4
// 
// 格式详解:
// 1. 主地点名称放在方括号中
// 2. 子地点之间使用竖线"|"分隔
// 3. 子地点与该地点的NPC角色之间使用"@"符号分隔
// 4. 多个角色之间使用逗号","分隔
//----------------------------------------------------------------------------------------------------------------------
var option;
(function (option_1) {
    const default_option = {
        should_send_directly: true,
        init_delay: 0, // 默认初始化延迟为0毫秒
    };
    async function parse_option() {
        const transformers = {
            '开启则直接发送，关闭则填在输入框': (value) => ({ should_send_directly: value }),
            '初始化延迟': (value, content) => ({ init_delay: content && !isNaN(Number(content)) ? Number(content) : 0 }),
        };
        return await getLorebookEntries(lorebook_name, { filter: { comment: '设置-' } })
            .then(entries => entries.map(entry => ({ 
                option: entry.comment.replace('设置-', ''), 
                value: entry.enabled,
                content: entry.content
            })))
            .then(entries => entries.reduce((result, { option, value, content }) => ({
            ...result,
            ...transformers[option]?.(value, content),
        }), default_option));
    }
    async function update() {
        const old_option = option_1.option;
        option_1.option = await parse_option();
        return !_.isEqual(option_1.option, old_option);
    }
    option_1.update = update;
})(option || (option = {}));
//----------------------------------------------------------------------------------------------------------------------
function parseMapData(text) {
    const lines = text.trim().split('\n');
    let result = {
        moveBlock: false,
        locations: []
    };
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        if (line.startsWith('[MOVEBLOCK:')) {
            result.moveBlock = line.includes('YES');
            continue;
        }
        
        const mainLocationMatch = line.match(/\[(.*?)\](.*)/);
        if (mainLocationMatch) {
            const mainLocation = mainLocationMatch[1].trim();
            const subLocationsText = mainLocationMatch[2].trim();
            const subLocations = subLocationsText.split('|').map(item => {
                const subItem = item.trim();
                let subLocation = subItem;
                let characters = [];
                
                // 使用@符号分隔子位置和角色信息，而不是空格
                // 格式: 子位置名@角色1,角色2,角色3
                const characterMatch = subItem.match(/(.*?)@(.*)/);
                if (characterMatch) {
                    subLocation = characterMatch[1].trim();
                    const characterText = characterMatch[2].trim();
                    if (characterText) {
                        characters = characterText.split(',').map(c => c.trim());
                    }
                }
                
                return {
                    name: subLocation,
                    characters: characters
                };
            });
            
            result.locations.push({
                name: mainLocation,
                subLocations: subLocations
            });
        }
    }
    
    return result;
}
//----------------------------------------------------------------------------------------------------------------------
var render;
(function (render) {
    let style = null;
    let selectedMainLocation = null;
    let selectedSubLocation = null;
    
    function locationClick($element, isMainLocation, data) {
        if ($element.parents('.last_mes').length > 0) {
            if (isMainLocation) {
                // 主地点点击，显示子地点
                const mainLocationName = $element.find('.location_name').text().trim();
                selectedMainLocation = mainLocationName;
                selectedSubLocation = null; // 清除已选子地点
                
                // 更新UI状态
                $element.closest('.map_container').find('.main_location').removeClass('selected');
                $element.addClass('selected');
                
                // 显示相应的子地点容器
                $element.closest('.map_container').find('.sub_location_container').hide();
                $element.closest('.map_container').find(`.sub_location_container[data-main="${mainLocationName}"]`).show();
                
                // 禁用前往按钮
                $element.closest('.map_container').find('.go_button').addClass('disabled');
            } else {
                // 子地点点击，选中但不立即前往
                const subLocationName = $element.find('.location_name').text().trim();
                selectedSubLocation = subLocationName;
                
                // 更新UI状态
                $element.closest('.sub_location_container').find('.sub_location').removeClass('selected');
                $element.addClass('selected');
                
                // 启用前往按钮
                $element.closest('.map_container').find('.go_button').removeClass('disabled');
            }
        }
    }
    
    function goToLocation($button, data) {
        if (!selectedMainLocation || !selectedSubLocation || data.moveBlock) return;
        
        // 查找选中的地点
        let mainLocation = data.locations.find(loc => loc.name === selectedMainLocation);
        if (!mainLocation) return;
        
        let subLocation = mainLocation.subLocations.find(loc => loc.name === selectedSubLocation);
        if (!subLocation) return;
        
        // 构建移动指令
        let moveCommand = `<request:{{user}}前往 ${selectedMainLocation} 的 ${selectedSubLocation}`;
        
        // 如果有角色，添加角色信息
        if (subLocation.characters && subLocation.characters.length > 0) {
            moveCommand += `,${selectedSubLocation} has:${subLocation.characters.join(',')}`;
        }
        
        // 关闭移动指令
        moveCommand += '>';
        
        // 发送命令
        if (option.option?.should_send_directly) {
            triggerSlash(`/send ${moveCommand} || /trigger`);
        } else {
            triggerSlash(`/setinput ${moveCommand}`);
        }
    }
    
    async function extract_style() {
        const entries = await getLorebookEntries(lorebook_name, { filter: { comment: '样式-' } }).then(entries => entries.filter(entry => entry.enabled));
        if (entries.length === 0) {
            return default_style;
        }
        return entries[0].content;
    }
    
    async function update() {
        const old_style = style;
        style = await extract_style();
        return old_style !== style;
    }
    render.update = update;
    
    function extract_map_element(text) {
        const $div = $('<div class="map_navigation">');
        
        // 添加样式
        if (style) {
            $div.append(style);
        } else {
            $div.append(default_style);
        }
        
        // 解析地图数据
        const data = parseMapData(text);
        
        // 创建地图容器
        const $mapContainer = $('<div class="map_container">');
        
        // 添加移动限制提示
        if (data.moveBlock) {
            $mapContainer.append($('<div class="move_block_notice">当前故事不允许自由移动</div>'));
        }
        
        // 添加主地点区域
        const $mainLocations = $('<div class="main_locations_container">');
        
        // 标题栏只包含标题
        const $titleBar = $('<div class="map_title_bar">');
        $titleBar.append('<h3>地图导航</h3>');
        $mainLocations.append($titleBar);
        
        // 添加所有主地点
        data.locations.forEach(location => {
            const $mainLocation = $('<div class="main_location" tabindex="1">')
                .append(`<span class="location_name">${location.name}</span>`)
                .on('click', function() {
                    if (!data.moveBlock) {
                        locationClick($(this), true, data);
                    }
                });
            $mainLocations.append($mainLocation);
        });
        
        $mapContainer.append($mainLocations);
        
        // 添加子地点区域
        data.locations.forEach(location => {
            const $subLocations = $(`<div class="sub_location_container" data-main="${location.name}" style="display:none;">`);
            
            // 添加所有子地点
            location.subLocations.forEach(subLocation => {
                const $subLocation = $('<div class="sub_location" tabindex="1">')
                    .append(`<span class="location_name">${subLocation.name}</span>`)
                    .on('click', function() {
                        if (!data.moveBlock) {
                            locationClick($(this), false, data);
                        }
                    });
                
                // 添加角色信息如果有的话，简化显示方式
                if (subLocation.characters && subLocation.characters.length > 0) {
                    const $charactersList = $('<div class="characters_list">');
                    subLocation.characters.forEach(character => {
                        $charactersList.append(`<span class="character_name">${character}</span>`);
                    });
                    $subLocation.append($charactersList);
                }
                
                $subLocations.append($subLocation);
            });
            
            $mapContainer.append($subLocations);
        });
        
        // 添加通用的前往按钮
        const $actionArea = $('<div class="map_action_area">');
        
        // 前往按钮
        const $goButton = $('<button class="go_button disabled">前往选中地点</button>')
            .on('click', function() {
                if (!$(this).hasClass('disabled') && !data.moveBlock) {
                    goToLocation($(this), data);
                }
            });
        
        $actionArea.append($goButton);
        $mapContainer.append($actionArea);
        
        $div.append($mapContainer);
        return $div;
    }
    
    render.extract_map_element = extract_map_element;
})(render || (render = {}));
//----------------------------------------------------------------------------------------------------------------------
async function renderOneMessage(message_id) {
    try {
        const message = (await getChatMessages(message_id))[0].message;
        const match = message.match(map_regex);
        if (!match) {
            return;
        }
        
        const mapContent = match[1];
        const $map_element = render.extract_map_element(mapContent);
        const $mes_text = retrieveDisplayedMessage(message_id);
        
        // 删除现有的地图UI
        $mes_text.find('.map_navigation').remove();
        
        // 添加新的地图UI
        $mes_text.append($map_element);
    } catch (error) {
        console.error('地图导航渲染错误:', error);
    }
}

async function renderAllMessage() {
    $('#chat', window.parent.document)
        .children(".mes[is_user='false'][is_system='false']")
        .each((_index, node) => {
            renderOneMessage(Number(node.getAttribute('mesid')));
        });
}
//----------------------------------------------------------------------------------------------------------------------
function errorCatched(fn) {
    return (...args) => {
        try {
            const result = fn(...args);
            if (result instanceof Promise) {
                return result.catch(error => {
                    console.error(`(${getIframeName()}) 错误:`, error);
                    triggerSlash(`/echo severity=error (${getIframeName()})${error.stack ? error.stack : error.name + ': ' + error.message}`);
                });
            }
            return result;
        } catch (error) {
            console.error(`(${getIframeName()}) 错误:`, error);
            triggerSlash(`/echo severity=error (${getIframeName()})${error.stack ? error.stack : error.name + ': ' + error.message}`);
            return undefined;
        }
    };
}
//----------------------------------------------------------------------------------------------------------------------
$(async () => {
    try {
        await errorCatched(option.update)();
        await errorCatched(render.update)();
        
        // 使用设置的初始化延迟
        const initDelay = option.option?.init_delay || 0;
        if (initDelay > 0) {
            console.log(`地图导航将在${initDelay}毫秒后初始化渲染`);
            setTimeout(() => {
                errorCatched(renderAllMessage)();
            }, initDelay);
        } else {
            await errorCatched(renderAllMessage)();
        }
        
        eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, errorCatched(renderOneMessage));
        eventOn(tavern_events.MESSAGE_UPDATED, errorCatched(renderOneMessage));
        eventOn(tavern_events.MESSAGE_SWIPED, errorCatched(renderOneMessage));
        eventOn(tavern_events.MESSAGE_DELETED, errorCatched(renderAllMessage));
        
        eventOn(tavern_events.WORLDINFO_UPDATED, errorCatched(async (lorebook) => {
            if (lorebook !== lorebook_name) {
                return;
            }
            
            const optionChanged = await option.update();
            const styleChanged = await render.update();
            
            if (optionChanged || styleChanged) {
                await renderAllMessage();
            }
        }));
        
        console.log("地图导航已加载");
    } catch (error) {
        console.error("地图导航加载失败:", error);
    }
});
//----------------------------------------------------------------------------------------------------------------------
const default_style = `
<style>
  .map_navigation {
    font-family: 'Arial', sans-serif;
    color: #e0e0e0;
  }
  
  .map_container {
    background-color: #1a1a1a;
    padding: 20px;
    border-radius: 16px;
    box-shadow: 10px 10px 20px rgba(0, 0, 0, 0.5), 
                -10px -10px 20px rgba(50, 50, 50, 0.1);
    display: flex;
    flex-direction: column;
    gap: 25px;
    margin: 15px 5px;
    border: 1px solid #333;
    position: relative;
    overflow: hidden;
  }
  
  .map_container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(to bottom, rgba(40, 40, 40, 0.2), transparent);
    pointer-events: none;
    border-radius: 16px 16px 0 0;
  }
  
  .move_block_notice {
    background-color: #2a1515;
    color: #ff8080;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #662222;
    text-align: center;
    font-weight: bold;
    margin-bottom: 15px;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5),
                inset -2px -2px 5px rgba(80, 40, 40, 0.1);
  }
  
  .map_title_bar {
    text-align: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #333;
    grid-column: 1 / -1;
  }
  
  .map_title_bar h3 {
    color: #aaa;
    font-size: 16px;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .main_locations_container, .sub_location_container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }
  
  .main_location, .sub_location {
    padding: 15px;
    background: #252525;
    border-radius: 12px;
    cursor: default;
    transition: all 0.3s ease;
    box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.4),
                -6px -6px 12px rgba(60, 60, 60, 0.1);
    border: 1px solid #333;
    position: relative;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .last_mes .main_location, .last_mes .sub_location {
    cursor: pointer;
  }
  
  .last_mes .main_location:hover, .last_mes .sub_location:hover {
    background: #2a2a2a;
    transform: translateY(-3px);
    box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.5),
                -8px -8px 16px rgba(60, 60, 60, 0.15);
    z-index: 1;
  }
  
  .last_mes .main_location:active, .last_mes .sub_location:active {
    transform: translateY(0);
    box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.4),
                -4px -4px 8px rgba(60, 60, 60, 0.1);
    background: #222;
  }
  
  .main_location.selected, .sub_location.selected {
    background: #2d3436;
    border-color: #00a8ff;
    box-shadow: 0 0 15px rgba(0, 168, 255, 0.3),
                6px 6px 12px rgba(0, 0, 0, 0.4),
                -6px -6px 12px rgba(60, 60, 60, 0.1);
    z-index: 2;
  }
  
  .main_location.selected::before, .sub_location.selected::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 5px;
    height: 100%;
    background: linear-gradient(to bottom, #00a8ff, #0097e6);
  }
  
  .location_name {
    font-weight: bold;
    font-size: 15px;
    display: block;
    margin-bottom: 8px;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  .characters_list {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  
  .character_name {
    display: inline-block;
    background: linear-gradient(145deg, #252525, #202020);
    padding: 4px 8px;
    margin: 2px;
    border-radius: 4px;
    color: #ddd;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
    font-size: 11px;
    border: 1px solid #333;
  }
  
  .map_action_area {
    display: flex;
    justify-content: center;
    padding-top: 15px;
    margin-top: 10px;
    border-top: 1px solid #333;
    grid-column: 1 / -1; /* 占据整行 */
  }
  
  .go_button {
    padding: 12px 25px;
    background: linear-gradient(145deg, #2c2c2c, #242424);
    border: none;
    border-radius: 30px;
    color: #fff;
    font-size: 14px;
    transition: all 0.3s ease;
    cursor: pointer;
    box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.4),
                -4px -4px 8px rgba(60, 60, 60, 0.1);
    position: relative;
    overflow: hidden;
  }
  
  .go_button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: all 0.5s ease;
  }
  
  .go_button:not(.disabled):hover {
    background: linear-gradient(145deg, #333, #292929);
    transform: translateY(-2px);
    box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.5),
                -6px -6px 12px rgba(60, 60, 60, 0.15);
  }
  
  .go_button:not(.disabled):hover::before {
    left: 100%;
  }
  
  .go_button:not(.disabled):active {
    transform: translateY(0);
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.4),
                -2px -2px 5px rgba(60, 60, 60, 0.1);
    background: linear-gradient(145deg, #222, #1e1e1e);
  }
  
  .go_button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: linear-gradient(145deg, #222, #1e1e1e);
  }
  
  /* 响应式布局 */
  @media (max-width: 600px) {
    .main_locations_container, .sub_location_container {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (min-width: 601px) and (max-width: 900px) {
    .main_locations_container, .sub_location_container {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  @media (min-width: 901px) {
    .main_locations_container, .sub_location_container {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  
  /* 自定义滚动条 */
  .map_container::-webkit-scrollbar {
    width: 8px;
  }
  
  .map_container::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 4px;
  }
  
  .map_container::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 4px;
    border: 2px solid #1a1a1a;
  }
  
  .map_container::-webkit-scrollbar-thumb:hover {
    background: #444;
  }
</style>
`;
//# sourceMappingURL=map_navigation.js.map