import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MerchandiseOption } from './marchandise-option.entity';
import { MerchandiseImage } from './merchandise-image.entity';
import { CartItem } from 'src/cart/entities/cart.item.entity';
import { Manager } from 'src/admin/entities/manager.entity';
import { GoodsShop } from 'src/goods_shop/entities/goods-shop.entity';
import { Community } from 'src/community/entities/community.entity';

@Entity('merchandise_post')
export class MerchandisePost {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  /**
   * 제목
   * @example "상품 제목"
   */
  @IsNotEmpty({ message: '제목을 입력해주세요' })
  @IsString()
  @Column()
  title: string;

  /**
   * 썸네일
   * @example "thunbnail.jpg"
   */
  @IsNotEmpty({ message: '썸네일 URL을 입력해주세요' })
  @IsString()
  @Column()
  thumbnail: string;

  /**
   * 내용
   * @example "상품 내용"
   */
  @IsNotEmpty({ message: '내용을 입력해주세요' })
  @IsString()
  @Column()
  content: string;

  /**
   * 배송비
   * @example 3000
   */
  @IsNotEmpty({ message: '배송비를 입력해주세요' })
  @IsNumber()
  @Column()
  deliveryPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 굿즈샵 연결
  @ManyToOne(() => GoodsShop, (goodsShop) => goodsShop.merchandisePost)
  @JoinColumn({ name: 'goodsShop_id' })
  goodsShop: GoodsShop;

  // 상품 이미지 연결
  @OneToMany(
    () => MerchandiseImage,
    (merchandiseImage) => merchandiseImage.merchandisePost,
    { onDelete: 'CASCADE' },
  )
  merchandiseImage: MerchandiseImage[];

  // 옵션 연결
  @OneToMany(
    () => MerchandiseOption,
    (merchandiseOption) => merchandiseOption.merchandisePost,
    { onDelete: 'CASCADE' },
  )
  merchandiseOption: MerchandiseOption[];

  // 주문 연결
  @OneToMany(() => CartItem, (cartItem) => cartItem.merchandisePost, {
    onDelete: 'CASCADE',
  })
  cartItems: CartItem[];
}
