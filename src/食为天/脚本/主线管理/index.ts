/**
 * 主线管理 webpack 入口
 *
 * 本文件是 webpack 的 entry，它仅仅 re-export 实际业务代码。
 * webpack 会把 角色卡/食为天/脚本/主线管理/ 下的所有模块打包成一个 bundle。
 * tavern_sync YAML 中的脚本引用应指向 dist 产物而非原始 .ts。
 */
export * from '../../../../角色卡/食为天/脚本/主线管理/index';
